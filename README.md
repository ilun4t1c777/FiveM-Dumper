# 🔥 FiveM-Dumper

**Dumper simples e poderoso para servidores FiveM**
**Simple and powerful dumper for FiveM servers**

[🇵🇹 Português](#-português) • [🇬🇧 English](#-english)

> ⚠️ **Aviso:** O uso indevido pode violar os termos de serviço do FiveM/Cfx.re.

---

## 📖 Sobre o projeto

### 🇵🇹 Português

O **FiveM-Dumper** é uma ferramenta simples que permite fazer **dump (extração)** de recursos e *streams* de um servidor FiveM.

Pode ser útil para:

* Guardar *streams* como mapas, props e veículos;
* Trabalhar com recursos num ambiente de desenvolvimento;
* Aprender sobre a estrutura de recursos do FiveM;
* Fazer testes nos seus próprios servidores.

### 🇬🇧 English

**FiveM-Dumper** is a simple tool that allows you to **dump (extract)** resources and *streams* from a FiveM server.

It can be useful for:

* Saving *streams* such as maps, props and vehicles;
* Working with resources in a development environment;
* Learning about the FiveM resource structure;
* Testing on your own servers.

---

## ✨ Funcionalidades / Features

| 🇵🇹 Português                          | 🇬🇧 English                          |
| --------------------------------------- | ------------------------------------- |
| ✅ Dump de recursos do servidor          | ✅ Dump server resources               |
| ✅ Guardar *streams*                     | ✅ Save *streams*                      |
| ✅ Configuração através de `config.json` | ✅ Configuration through `config.json` |
| ✅ Fácil de utilizar                     | ✅ Easy to use                         |
| ✅ Adequado para iniciantes              | ✅ Beginner friendly                   |
| ✅ Open-source                           | ✅ Open-source                         |

---

## 📋 Requisitos / Requirements

Antes de começar, certifique-se de que tem:

* [Node.js](https://nodejs.org/) instalado;
* Acesso à linha de comandos/terminal;
* Um servidor FiveM próprio ou autorização para realizar o dump.

---

## ⚙️ Configuração / Configuration

Toda a configuração é feita através do ficheiro `config.json`.

### Exemplo / Example

```json
{
  "server": "IP_DO_SERVIDOR:PORTA",
  "saveStreams": true,
  "outputFolder": "./dumps"
}
```

### Opções / Options

| Opção / Option | 🇵🇹 Descrição                                 | 🇬🇧 Description                  | Exemplo / Example   |
| -------------- | ---------------------------------------------- | --------------------------------- | ------------------- |
| `server`       | IP e porta do servidor                         | Server IP and port                | `"127.0.0.1:30120"` |
| `saveStreams`  | Ativa ou desativa o armazenamento de *streams* | Enables or disables stream saving | `true`              |
| `outputFolder` | Pasta onde os ficheiros serão guardados        | Folder where files will be saved  | `"./dumps"`         |

> 💡 **Dica / Tip:**
> Se estiver a trabalhar no seu próprio servidor, utilize o endereço e a porta configurados no servidor FiveM.

---

## 🚀 Instalação e utilização / Installation & Usage

### 🇵🇹 Português

#### 1. Clonar o projeto

```bash
git clone <URL_DO_REPOSITÓRIO>
cd FiveM-Dumper
```

#### 2. Instalar as dependências

```bash
npm install
```

#### 3. Configurar o projeto

Abra o ficheiro:

```text
config.json
```

e configure os valores de acordo com o seu servidor.

#### 4. Executar

```bash
node index.js
```

#### 5. Consultar os resultados

Quando o processo terminar, os ficheiros serão guardados na pasta definida em:

```json
"outputFolder": "./dumps"
```

---

### 🇬🇧 English

#### 1. Clone the repository

```bash
git clone <REPOSITORY_URL>
cd FiveM-Dumper
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Configure the project

Open:

```text
config.json
```

and configure the values according to your server.

#### 4. Run the dumper

```bash
node index.js
```

#### 5. Check the output

Once the process finishes, the dumped files will be stored in the folder specified by:

```json
"outputFolder": "./dumps"
```

---

## 📁 Estrutura do projeto / Project Structure

Uma estrutura típica do projeto poderá ser semelhante a:

```text
FiveM-Dumper/
├── dumps/
├── config.json
├── index.js
├── package.json
├── package-lock.json
└── README.md
```

Os ficheiros extraídos serão armazenados dentro da pasta `dumps/`, caso essa seja a pasta definida no `config.json`.

---

## 📦 Output

Com a seguinte configuração:

```json
{
  "server": "127.0.0.1:30120",
  "saveStreams": true,
  "outputFolder": "./dumps"
}
```

os resultados serão guardados em:

```text
FiveM-Dumper/
└── dumps/
    ├── resources/
    └── streams/
```

> ℹ️ A estrutura final dos ficheiros pode variar dependendo dos recursos disponíveis no servidor e da implementação atual do dumper.

---

## ❓ Problemas comuns / Common Issues

| Problema / Issue           | 🇵🇹 Solução                                           | 🇬🇧 Solution                                  |
| -------------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| ❌ Não liga ao servidor     | Verifique o IP e a porta no `config.json`.             | Check the IP and port in `config.json`.        |
| ❌ Não guarda *streams*     | Confirme que `saveStreams` está definido como `true`.  | Make sure `saveStreams` is set to `true`.      |
| ❌ Não aparecem ficheiros   | Verifique a pasta de saída e as permissões de escrita. | Check the output folder and write permissions. |
| ❌ `node` não é reconhecido | Instale o Node.js e reinicie o terminal.               | Install Node.js and restart your terminal.     |
| ❌ Erro nas dependências    | Execute `npm install` novamente.                       | Run `npm install` again.                       |

---

## 💡 Dicas para iniciantes / Beginner Tips

### 🇵🇹 Português

* 🧪 Comece sempre por testar num servidor próprio ou de desenvolvimento.
* 📁 Verifique o `outputFolder` antes de iniciar o processo.
* 💾 Utilize `"saveStreams": true` quando quiser guardar *streams*.
* 🔐 Não utilize a ferramenta em servidores sem autorização.
* 📖 Consulte este README caso tenha dúvidas sobre a configuração.

### 🇬🇧 English

* 🧪 Always start by testing on your own development server.
* 📁 Check the `outputFolder` before starting the process.
* 💾 Use `"saveStreams": true` when you want to save streams.
* 🔐 Do not use the tool on servers without authorization.
* 📖 Check this README if you have questions about the configuration.

---

## ⚠️ Aviso legal / Legal Notice

### 🇵🇹 Português

Esta ferramenta é disponibilizada para **fins educativos, de desenvolvimento e de teste**.

Utilize-a apenas em:

* Servidores que sejam seus;
* Ambientes de desenvolvimento;
* Servidores onde tenha autorização explícita para realizar estas operações.

O utilizador é responsável pela utilização que fizer desta ferramenta. O uso não autorizado de recursos de terceiros poderá violar direitos de autor, termos de serviço ou outras regras aplicáveis.

### 🇬🇧 English

This tool is provided for **educational, development and testing purposes**.

Only use it on:

* Servers that you own;
* Development environments;
* Servers where you have explicit permission to perform these operations.

The user is responsible for how this tool is used. Unauthorized extraction of third-party resources may violate copyright, terms of service, or other applicable rules.

---

## 🤝 Contribuir / Contributing

Contributions are welcome!

### 🇵🇹 Português

Se quiser contribuir para o projeto:

1. Faça um **fork** do repositório;
2. Crie uma nova branch;
3. Faça as suas alterações;
4. Envie um **Pull Request**.

### 🇬🇧 English

If you want to contribute:

1. **Fork** the repository;
2. Create a new branch;
3. Make your changes;
4. Submit a **Pull Request**.

---

## 📜 Licença / License

Este projeto é **open-source**.

É permitido utilizar, modificar e partilhar o projeto, desde que sejam respeitadas as condições da licença definida no repositório.

> 📄 Consulte o ficheiro `LICENSE` para obter os termos completos da licença.

---

## ❤️ Agradecimentos / Credits

**🇵🇹** Disponibilizado gratuitamente para a comunidade FiveM.
**🇬🇧** Freely provided to the FiveM community.

Obrigado por utilizares o **FiveM-Dumper**! ❤️

**Thank you for using FiveM-Dumper! ❤️**
