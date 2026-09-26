const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path')
class RagePackfile {
    constructor() {
        this.fileHandle = null;
        this.parentPtr = 0;
        this.pathPrefix = '';
        this.header = null;
        this.entries = [];
        this.nameTable = Buffer.alloc(0);
        this.handles = new Array(128).fill(null);
    }

    /**
     * Open and parse a Rage packfile (RPF2)
     * @param {string} archivePath - Path to the RPF archive
     * @returns {Promise<boolean>} Success status
     */
    async openArchive(archivePath) {
        try {
            // Open the file
            this.fileHandle = await fs.open(archivePath, 'r');

            // Read the header (20 bytes)
            const headerBuffer = Buffer.alloc(20);
            await this.fileHandle.read(headerBuffer, 0, 20, 0);

            // Parse header
            this.header = {
                magic: headerBuffer.readUInt32LE(0),
                tocSize: headerBuffer.readUInt32LE(4),
                numEntries: headerBuffer.readUInt32LE(8),
                unkFlag: headerBuffer.readUInt32LE(12),
                cryptoFlag: headerBuffer.readUInt32LE(16)
            };

            // Verify magic (RPF2 = 0x32465052)
            if (this.header.magic !== 0x32465052) {
                throw new Error('Invalid magic (not RPF2)');
            }

            // Check if encrypted
            if (this.header.cryptoFlag !== 0) {
                throw new Error('Only non-encrypted RPF2 is supported');
            }

            // Read TOC (Table of Contents) starting at offset 2048
            const tocBuffer = Buffer.alloc(this.header.tocSize);
            await this.fileHandle.read(tocBuffer, 0, this.header.tocSize, 2048);

            // Parse entries (16 bytes each)
            const entryTableSize = this.header.numEntries * 16;
            this.entries = [];

            for (let i = 0; i < this.header.numEntries; i++) {
                const offset = i * 16;
                const entry = {
                    nameOffset: tocBuffer.readUInt32LE(offset),
                    length: tocBuffer.readUInt32LE(offset + 4),
                    dataOffset: tocBuffer.readUInt32LE(offset + 8) & 0x7FFFFFFF, // 31 bits
                    isDirectory: (tocBuffer.readUInt32LE(offset + 8) >> 31) & 1, // 1 bit
                    flags: tocBuffer.readUInt32LE(offset + 12)
                };
                this.entries.push(entry);
            }

            // Copy name table
            this.nameTable = Buffer.from(tocBuffer.subarray(entryTableSize));

            return true;
        } catch (error) {
            console.error('Error opening archive:', error.message);
            if (this.fileHandle) {
                await this.fileHandle.close();
                this.fileHandle = null;
            }
            return false;
        }
    }

    /**
     * Find an entry by path
     * @param {string} path - File path
     * @returns {object|null} Entry object or null
     */
    findEntry(path) {
        // Remove path prefix
        let relativePath = path;
        if (this.pathPrefix && path.startsWith(this.pathPrefix)) {
            relativePath = path.substring(this.pathPrefix.length);
        }

        // Start at root
        let entry = this.entries[0];

        // Handle root path
        if (!relativePath || relativePath === '/' || relativePath === '') {
            return entry;
        }

        let pos = 0;

        // Skip leading slashes
        while (relativePath[pos] === '/') {
            pos++;
        }

        // If only slashes, return root
        if (pos >= relativePath.length) {
            return entry;
        }

        let nextPos = relativePath.indexOf('/', pos);

        // Traverse the directory tree
        while (true) {
            if (!entry) {
                return null;
            }

            // If this is a directory
            if (entry.isDirectory) {
                const key = nextPos === -1
                    ? relativePath.substring(pos)
                    : relativePath.substring(pos, nextPos);

                // Return directory if key is empty
                if (key === '') {
                    return entry;
                }

                // Binary search in directory entries
                entry = this._binarySearchEntry(entry, key);

                // Fallback to case-insensitive linear search
                if (!entry) {
                    entry = this._linearSearchEntry(this.entries[0], key);
                }
            } else {
                // File entry found
                return entry;
            }

            if (nextPos === -1) {
                return entry;
            }

            pos = nextPos + 1;

            // Skip additional slashes
            while (relativePath[pos] === '/') {
                pos++;
            }

            nextPos = relativePath.indexOf('/', pos);

            if (!entry) {
                return null;
            }
        }
    }

    /**
     * Binary search for entry in directory
     * @private
     */
    _binarySearchEntry(dirEntry, key) {
        let left = 0;
        let right = dirEntry.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const entry = this.entries[dirEntry.dataOffset + mid];
            const name = this._getEntryName(entry);
            const cmp = key.localeCompare(name);

            if (cmp === 0) {
                return entry;
            } else if (cmp < 0) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        return null;
    }

    /**
     * Case-insensitive linear search
     * @private
     */
    _linearSearchEntry(dirEntry, key) {
        if (!dirEntry || !dirEntry.isDirectory) {
            return null;
        }

        const lowerKey = key.toLowerCase();
        const startIdx = dirEntry.dataOffset;
        const endIdx = startIdx + dirEntry.length;

        // Bounds check
        if (startIdx >= this.entries.length || endIdx > this.entries.length) {
            return null;
        }

        for (let i = 0; i < dirEntry.length; i++) {
            const entry = this.entries[dirEntry.dataOffset + i];
            if (!entry) continue;

            const name = this._getEntryName(entry).toLowerCase();

            if (name === lowerKey) {
                return entry;
            }
        }

        return null;
    }

    /**
     * Get entry name from name table
     * @private
     */
    _getEntryName(entry) {
        let end = entry.nameOffset;
        while (end < this.nameTable.length && this.nameTable[end] !== 0) {
            end++;
        }
        return this.nameTable.toString('utf8', entry.nameOffset, end);
    }

    /**
     * Read file contents
     * @param {string} fileName - File path
     * @returns {Promise<Buffer|null>} File contents or null
     */
    async readFile(fileName) {
        const entry = this.findEntry(fileName);

        if (!entry || entry.isDirectory) {
            return null;
        }

        const buffer = Buffer.alloc(entry.length);
        await this.fileHandle.read(buffer, 0, entry.length, this.parentPtr + entry.dataOffset);

        return buffer;
    }

    /**
     * List directory contents
     * @param {string} folderPath - Directory path
     * @returns {Array<object>} Array of entry objects with name, isDirectory, and length
     */
    listDirectory(folderPath) {
        const entry = this.findEntry(folderPath);

        if (!entry || !entry.isDirectory) {
            return [];
        }

        const results = [];

        // Check if dataOffset + length would exceed entries array
        const startIdx = entry.dataOffset;
        const endIdx = startIdx + entry.length;

        if (startIdx >= this.entries.length || endIdx > this.entries.length) {
            console.warn(`Directory entry out of bounds: start=${startIdx}, end=${endIdx}, total=${this.entries.length}`);
            return [];
        }

        for (let i = 0; i < entry.length; i++) {
            const childEntry = this.entries[entry.dataOffset + i];
            if (childEntry) {
                results.push({
                    name: this._getEntryName(childEntry),
                    isDirectory: childEntry.isDirectory === 1,
                    length: childEntry.length,
                    dataOffset: childEntry.dataOffset
                });
            }
        }

        return results;
    }

    /**
     * Check if file exists
     * @param {string} fileName - File path
     * @returns {boolean} True if exists
     */
    exists(fileName) {
        const entry = this.findEntry(fileName);
        return entry !== null;
    }

    /**
     * Get file length
     * @param {string} fileName - File path
     * @returns {number} File length or -1
     */
    getLength(fileName) {
        const entry = this.findEntry(fileName);
        return entry ? entry.length : -1;
    }

    /**
     * Set path prefix for relative paths
     * @param {string} prefix - Path prefix
     */
    setPathPrefix(prefix) {
        this.pathPrefix = prefix.replace(/\/+$/, '');
    }

    /**
     * Close the archive
     */
    async close() {
        if (this.fileHandle) {
            await this.fileHandle.close();
            this.fileHandle = null;
        }
    }

    /**
     * Get all files recursively
     * @param {string} path - Starting path (default: root)
     * @returns {Array<string>} Array of file paths
     */
    getAllFiles(path = '/') {
        const files = [];
        const entry = this.findEntry(path);

        if (!entry) {
            return files;
        }

        if (entry.isDirectory) {
            const children = this.listDirectory(path);

            for (const child of children) {
                const childPath = path === '/' ? `/${child.name}` : `${path}/${child.name}`;

                if (child.isDirectory) {
                    files.push(...this.getAllFiles(childPath));
                } else {
                    files.push(childPath);
                }
            }
        } else {
            files.push(path);
        }

        return files;
    }
}

module.exports = RagePackfile;
