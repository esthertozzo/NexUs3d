import express from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import path from 'path';
import fs from 'fs'
import methodOverride from 'method-override';
import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

app.use(express.static('public'));
app.use(express.json());
const MODEL_NAME = "gemini-pro";
const API_KEY = "SUA_API_KEY_AQUI";

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(session({
    secret: 'qi23nbe194238biufo2q',
    resave: false,
    saveUninitialized: true,
}));

const urlMongo = 'mongodb://localhost:27017/';
const nomeBanco = 'NexUs';

app.use('/', express.static(join(__dirname, 'index.html')));

async function runChat(chatInput) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 500,
    };
  
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
  
    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: [
        {
          role: "user",
          parts: [{ text: "Você é um assistente virtual (chamado Nex) que faz parte do nosso site chamado Nexus3D (seu chatbot está disponível no nosso site para os usuários).Sua principal função é tirar dúvidas do usuário, que não faz ideia do que se trata o projeto, redirecionando-o para os benefícios que ele estar em nosso site, cativando-o a querer mais e apresentando as nossas principais diferenças de outras plataformas de próteses 3D. A Nexus3D é uma plataforma online que oferece planos de próteses 3d (próteses de membros inferiores e superiores) para hospitais; esses hospitais oferecem os serviços da Nexus3D para seus pacientes que possuem necessidades. O material das nossas próteses é o filamento da cana-de-açúcar e nós possuimos o selo B-corp (que é concebido para empresas que equilibram lucro e propósito, com altos padrões de desempenho social e ambiental, transparência e responsabilidade legal). A impressão 3D pode melhorar a segurança e o bem-estar dos pacientes, além de reduzir o tempo de recuperação. Com menos tempo de espera para próteses ou adaptações e menor custo geral para o tratamento, gerando mais confiança no serviço. Também as próteses serão feitas com materiais biodegradáveis para fazer o descarte correto. Os principais diferenciais da nossa empresa são: redução drastica de custo por ser impressão 3D; peças personalizadas feitas sob demanda uqe evitam desperdício, são mais rápidas de produzir e podem durar mais, reduzindo a necessidade de manutenção frequente; rapidez na entrega. Inicialmente, quando o usuário iniciar um conversa com você, seja breve e objetivo. Você poderá atender pacientes e hospitais, saiba diferenciar bem eles, atendendo de forma os dois (tirando suas dúvidas e entendendo os casos apresentados dos pacientes)."}],
        },
        {
          role: "model",
          parts: [{ text: "Olá, sou o seu assistente virtual, o Nex. Como posso te auxiliar?"}],
        },
        {
          role: "user",
          parts: [{ text: "Olá"}],
        },
      ],
    });
  
    const result = await chat.sendMessage(chatInput);
    const response = result.response;
    return response.text();
  }

  app.post('/chat', async (req, res) => {
    try {
      const chatInput = req.body?.chatInput;
      console.log('incoming /chat req', chatInput)
      if (!chatInput) {
        return res.status(400).json({ error: 'Invalid request body' });
      }
      const response = await runChat(chatInput);
      res.json({ response });
    } catch (error) {
      console.error('Error in chat endpoint:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

app.get('/perfilPaciente', protegerRota, async (req, res) => {
    const dadosHospital = req.session.usuario;
    const cliente = new MongoClient(urlMongo);

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoPacientes = banco.collection('pacientes');
    
        const pacientes = await colecaoPacientes.find({ hospitalId: new ObjectId(dadosHospital._id) }).toArray();

        fs.readFile(__dirname + '/perfilPaciente.html', 'utf8', (err, data) => {
            if (err) {
                res.send('Erro ao carregar o perfil.');
            } else {
                let htmlComDados = data
                    .replace('{{nomeHospital}}', dadosHospital.nomeHospital)
                    .replace('{{nomeAdm}}', dadosHospital.nomeAdm)
                    .replace('{{email}}', dadosHospital.email)
                    .replace('{{especialidade}}', dadosHospital.especialidade)
                    .replace('{{cnpjHospital}}', dadosHospital.cnpjHospital)
                    .replace('{{tipo}}', dadosHospital.tipo)
                    .replace('{{hospId}}', dadosHospital._id)
                    .replace('{{hospIdd}}', dadosHospital._id)
                    .replace('{{pacientes}}', criarSaidaP(pacientes));

                res.send(htmlComDados);
            }
        });
    } catch (err) {
        console.error('Erro ao buscar os pacientes:', err);
        res.status(500).send('Erro ao buscar os pacientes.');
    } finally {
        cliente.close();
    }
});


app.get('/acessibilidade', async (req, res) => {
    res.sendFile(__dirname + '/acessibilidade.html')
});

app.get('/autoestima', async (req, res) => {
    res.sendFile(__dirname + '/autoestima.html')
});

app.get('/filamento', async (req, res) => {
    res.sendFile(__dirname + '/filamento.html')
});

app.get('/sobre', async (req, res) => {
    res.sendFile(__dirname + '/sobre.html')
});

app.get('/time', async (req, res) => {
    res.sendFile(__dirname + '/time.html')
});

app.get('/cadastroHospital', async (req, res) => {
    res.sendFile(__dirname + '/cadastroHospital.html')
});

app.post('/cadastroHospital', async (req, res) => {
    const cliente = new MongoClient(urlMongo, { useUnifiedTopology: true });

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoUsuarios = banco.collection('usuarios');

        const usuarioExistente = await colecaoUsuarios.findOne({ usuario: req.body.usuario });

        if (usuarioExistente) {
            res.send('Usuário já existe! Tente outro nome de usuário.');
        } else {
            const senhaCriptografada = await bcrypt.hash(req.body.senha, 10);

            await colecaoUsuarios.insertOne({
                usuario: req.body.usuario,
                senha: senhaCriptografada,
                nomeHospital: req.body.nomeHospital,
                cnpjHospital: req.body.cnpjHospital,
                email: req.body.email,
                nomeAdm: req.body.nomeAdm,
                tipo: req.body.tipo,
                especialidade: req.body.especialidade
            });
            res.redirect('/?success=true');
        }
    } catch (erro) {
        res.send('Erro ao registrar o usuário.');
    } finally {
        cliente.close();
    }
});

app.post('/login', async (req, res) => {

    const cliente = new MongoClient(urlMongo, { useUnifiedTopology: true });

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoUsuarios = banco.collection('usuarios');

        const usuario = await colecaoUsuarios.findOne({ usuario: req.body.usuario });

        if (usuario && await bcrypt.compare(req.body.senha, usuario.senha)) {
            req.session.usuario = {
                _id: usuario._id, 
                nomeHospital: usuario.nomeHospital,
                cnpjHospital: usuario.cnpjHospital,
                email: usuario.email,
                nomeAdm: usuario.nomeAdm,
                tipo: usuario.tipo,
                especialidade: usuario.especialidade
            };
            res.redirect('/perfilPaciente');
        } else {
            res.redirect('/erro');
        }
    } catch (erro) {
        res.send('Erro ao realizar o login.');
    } finally {
        cliente.close();
    }
});


function protegerRota(req, res, proximo) {
    if (req.session.usuario) {
        proximo();
    } else {
        res.redirect('/');
    }
}

app.get('/erro', (req, res) => {
    res.sendFile(__dirname + '/erro.html');
});

app.get('/sair', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send('Erro ao sair!');
        }
        res.redirect('/');

    });
});

app.get('/hospital/:id', async (req, res) => {
    const id = req.params.id;
    const cliente = new MongoClient(urlMongo);

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoUsuarios = banco.collection('usuarios');

        const hospital = await colecaoUsuarios.findOne({ _id: new ObjectId(id) });

        if (hospital) {
            res.json(hospital);
        } else {
            res.status(404).send('Hospital não encontrado.');
        }
    } catch (err) {
        console.error('Erro ao buscar o hospital:', err);
        res.status(500).send('Erro ao buscar o hospital. Por favor, tente novamente mais tarde.');
    } finally {
        cliente.close();
    }
});

app.get('/hospitais', async (req, res) => {
    const cliente = new MongoClient(urlMongo);

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoUsuarios = banco.collection('usuarios');

        const hospitais = await colecaoUsuarios.find({},
            { projection: { _id: 1, nomeHospital: 1, cnpjHospital: 1, email: 1, nomeAdm: 1, especialidade: 1, tipo: 1 } }).toArray();

        res.json(hospitais);
    } catch {
        console.error('Erro ao buscar hospitais:', err);
        res.status(500).send('Erro ao buscar pacientes. Por favor, tente novamente mais tarde.');
    } finally {
        cliente.close();
    }
});


app.get('/atualizarHospital', (req, res) => {
    res.sendFile(__dirname + '/atualizarHospital.html');
});

app.post('/atualizarHospital/:id', async (req, res) => {
    const { id, nomeHospital, cnpjHospital, email, nomeAdm, especialidade, tipo } = req.body;
    const cliente = new MongoClient(urlMongo);

    console.log(req.body)

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoUsuarios = banco.collection('usuarios');

        const hospitalAtualizado = await colecaoUsuarios.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    id, nomeHospital, cnpjHospital, email, nomeAdm, especialidade, tipo
                }
            }
        );

        if (hospitalAtualizado.modifiedCount > 0) {
            console.log(`Hospital com ID: ${id} atualizado com sucesso.`);
            res.redirect('/');
        } else {
            res.status(404).send('Hospital não encontrado.');
        }
    } catch (err) {
        console.error('Erro ao atualizar as informações do hospital:', err);
        res.status(500).send('Erro ao atualizar as informações do hospital. Por favor, tente novamente mais tarde.');
    } finally {
        cliente.close();
    }
});


app.delete('/deletarHospital', async (req, res) => {
    const { id } = req.body;
    const cliente = new MongoClient(urlMongo);

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoUsuarios = banco.collection('usuarios');
        const colecaoPacientes = banco.collection('pacientes');

        const result = await colecaoUsuarios.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount > 0) {
            console.log(`Hospital com ID: ${id} deletado com sucesso.`);
            
            await colecaoPacientes.deleteMany({ hospitalId: new ObjectId(id) });
            console.log('Pacientes do hospital deletados com sucesso.');
            
            res.redirect('/');
        } else {
            res.status(404).send('Hospital não encontrado.');
        }
    } catch (err) {
        console.error('Erro ao deletar o hospital:', err);
        res.status(500).send('Erro ao deletar o hospital. Por favor, tente novamente mais tarde.');
    } finally {
        cliente.close();
    }
});

app.get('/cadastroPaciente', async (req, res) => {
    res.sendFile(__dirname + '/cadastroPaciente.html')
});

app.get('/cadastroPaciente', async (req, res) => {
    const cliente = new MongoClient(urlMongo);

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoPacientes = banco.collection("pacientes");
        const pacientes = await colecaoPacientes.find({}).toArray();

        res.status(200).json(pacientes);

    } catch (err) {
        console.error('Erro ao achar os pacientes:', err);
        res.status(500).send('Erro ao achar os pacientes. Por favor, tente novamente mais tarde');
    } finally {
        await cliente.close();
    }
});

app.post('/cadastroPaciente', async (req, res) => {
    const { nome, email, cpf, protese } = req.body;
    const cliente = new MongoClient(urlMongo);


    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoPacientes = banco.collection("pacientes");
        
        const hospitalId = req.session.usuario._id;
        const paciente = { hospitalId: new ObjectId(hospitalId), nome, email, cpf, protese };

        const result = await colecaoPacientes.insertOne(paciente);
        console.log(`Paciente cadastrado com sucesso. ID: ${result.insertedId}`);
        res.redirect('/perfilPaciente');
    } catch (err) {
        console.error('Erro ao cadastrar o paciente:', err);
        res.status(500).send('Erro ao cadastrar o paciente. Por favor, tente novamente mais tarde');
    } finally {
        cliente.close();
    }
});

app.get('/pacientes', async (req, res) => {
    const cliente = new MongoClient(urlMongo);

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoPacientes = banco.collection("pacientes");

        const pacientes = await colecaoPacientes.find({},
            { projection: { _id: 1, hospitalId: 1, nome: 1, email: 1, cpf: 1, protese: 1 } }).toArray();

        res.json(pacientes);
    } catch {
        console.error('Erro ao buscar pacientes:', erro);
        res.status(500).send('Erro ao buscar pacientes. Por favor, tente novamente mais tarde.');
    } finally {
        cliente.close();
    }
});

app.get('/paciente/:id', async (req, res) => {
    const { id } = req.params;

    const cliente = new MongoClient(urlMongo);

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoPacientes = banco.collection("pacientes");

        const paciente = await colecaoPacientes.findOne({ _id: new ObjectId(id) });

        if (!paciente) {
            return res.status(404).send('Paciente não encontrado.');
        }

        res.json(paciente);
    } catch (err) {
        console.error('Erro ao buscar o paciente:', err);
        res.status(500).send('Erro ao buscar o paciente. Por favor, tente novamente mais tarde.');
    } finally {
        cliente.close();
    }
});


app.get('/atualizarPaciente', (req, res) => {
    res.sendFile(__dirname + '/atualizarPaciente.html');
});

app.post('/atualizarPaciente', async (req, res) => {
    const { id, nome, email, cpf, protese } = req.body;
    const cliente = new MongoClient(urlMongo);

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoPacientes = banco.collection("pacientes");

        const pacienteAtualizado = await colecaoPacientes.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    id, nome, email, cpf, protese
                }
            }
        );

        if (pacienteAtualizado.modifiedCount > 0) {
            console.log(`Paciente com ID: ${id} atualizado com sucesso.`);
            res.redirect('/perfilPaciente');
        } else {
            res.status(404).send('Paciente não encontrado.');
        }
    } catch (err) {
        console.error('Erro ao atualizar o paciente:', err);
        res.status(500).send('Erro ao atualizar o paciente. Por favor, tente novamente mais tarde.');
    } finally {
        cliente.close();
    }
});

function criarSaidaP(pacientes) {
    let saidaHtml1 = '';
    pacientes.forEach(paciente => {
        saidaHtml1 += `
            <tbody>
                             <tr>
                             <th scope="row">
                                 <div>
                             <a href="/atualizarPaciente?id=${paciente._id}" class="btn-cart btn btn">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
  <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
  <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
</svg>
                             </a> 
                             <form action="/deletarPaciente" method="post" onsubmit="return confirm('Tem certeza que deseja excluir o Paciente ${paciente.nome}?');" style="display:inline;">
             <input type="hidden" name="id" value="${paciente._id}">
             <button type="submit" class="btn-cart btn btn">
                             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="icon bi bi-trash-fill" viewBox="0 0 16 16">
                                 <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/>
                               </svg>
                             </button>
         </form>

                         </div>
                                 </div>

                                 </th>
                             <td>${paciente.nome}</td>
                             <td>${paciente.email}</td>
                            <td>${paciente.cpf}</td>
                             <td>${paciente.protese}</td>
                             <td>

                             </td>
                             </tr>
                         </tbody>
        `;
    });
    return saidaHtml1;
}

function criarSaidaPcpf(paciente) {
    return `
     <tbody>
                             <tr>
                             <th scope="row">
                                 <div>
                             <a href="/atualizarPaciente?id=${paciente._id}" class="btn-cart btn btn">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
  <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
  <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
</svg>
                             </a> 
                             <form action="/deletarPaciente" method="post" onsubmit="return confirm('Tem certeza que deseja excluir o Paciente ${paciente.nome}?');" style="display:inline;">
             <input type="hidden" name="id" value="${paciente._id}">
             <button type="submit" class="btn-cart btn btn">
                             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="icon bi bi-trash-fill" viewBox="0 0 16 16">
                                 <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/>
                               </svg>
                             </button>
         </form>

                         </div>
                                 </div>

                                 </th>
                             <td>${paciente.nome}</td>
                             <td>${paciente.email}</td>
                            <td>${paciente.cpf}</td>
                             <td>${paciente.protese}</td>
                             <td>

                             </td>
                             </tr>
                         </tbody>
     `
}

app.get('/buscarPaciente', async (req, res) => {
    const cpf = req.query.cpf;

    const cliente = new MongoClient(urlMongo);

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoPacientes = banco.collection("pacientes");

        const pacienteBuscado = await colecaoPacientes.find({ cpf: cpf }).toArray();

        if (!pacienteBuscado) {
            return res.status(404).send('Paciente não encontrado.');
        }

        const pageHtmlPath = path.join(__dirname, '/saidaPaciente.html');
        let pageHtml = fs.readFileSync(pageHtmlPath, 'utf-8');
        const saidaHtml = pacienteBuscado.map(criarSaidaPcpf).join('');
        pageHtml = pageHtml.replace('{{saidaPaciente}}', saidaHtml);
        res.send(pageHtml);

    } catch (err) {
        console.error('Erro ao buscar o paciente:', err);
        res.status(500).send('Erro ao buscar o paciente. Por favor, tente novamente mais tarde.');
    } finally {
        cliente.close();
    }
});

app.post('/deletarPaciente', async (req, res) => {
    const { id } = req.body;

    const cliente = new MongoClient(urlMongo);

    try {
        await cliente.connect();
        const banco = cliente.db(nomeBanco);
        const colecaoPacientes = banco.collection("pacientes");

        const result = await colecaoPacientes.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
            console.log(`Paciente com ID: ${id} deletado com sucesso.`);
            res.redirect('/perfilPaciente');
        } else {
            res.status(404).send('Paciente não encontrado.');
        }
    } catch (err) {
        console.error('Erro ao deletar o paciente:', err);
        res.status(500).send('Erro ao deletar o paciente. Por favor, tente novamente mais tarde.')
    } finally {
        cliente.close();
    }
});

app.listen(port, () => {
    console.log(`Servidor Node.js em execução em http://localhost:${port}`);
});
