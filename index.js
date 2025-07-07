// index.js da IA do Emprego
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path'; // Importa o módulo path para lidar com caminhos de arquivos
import { fileURLToPath } from 'url'; // Importa fileURLToPath para obter o caminho do arquivo atual

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url); // Obtém o caminho do arquivo atual
const __dirname = path.dirname(__filename); // Obtém o diretório do arquivo atual

// Adiciona um log para verificar o __dirname no Render
console.log(`Caminho atual do diretório (__dirname): ${__dirname}`);
console.log(`Caminho para a pasta public: ${path.join(__dirname, 'public')}`);


app.use(cors()); // Permite requisições de diferentes origens (importante para o frontend)
app.use(express.json({ limit: '10mb' })); // Habilita o Express a parsear corpos de requisição JSON, com limite maior para futuras funcionalidades (ex: upload de imagens)

// Serve arquivos estáticos da pasta 'public'
// Isso fará com que o Render sirva seu index.html e outros arquivos do frontend
// Mantenha esta linha para servir outros assets (CSS, JS, imagens) que possam estar na pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Configuração da API do Gemini
// Se você estiver no ambiente Canvas, a chave será injetada automaticamente se for uma string vazia.
// Caso contrário, substitua pela sua chave de API do Gemini.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// =========================
// Função auxiliar para chamar a API do Gemini
// =========================
async function callGemini(promptText, chatHistory = []) {
    try {
        // Adiciona o prompt atual ao histórico de chat para enviar ao Gemini
        chatHistory.push({ role: "user", parts: [{ text: promptText }] });

        const payload = {
            contents: chatHistory,
            // Você pode adicionar um generationConfig aqui se precisar de um formato de resposta específico (ex: JSON)
            // generationConfig: {
            //     responseMimeType: "application/json",
            //     responseSchema: { ... }
            // }
        };

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro na resposta da API do Gemini:', response.status, errorData);
            throw new Error(`Erro da API do Gemini: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`);
        }

        const result = await response.json();

        // Extrai o texto da resposta do Gemini
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            // Adiciona a resposta do Gemini ao histórico de chat (para futuras interações, se aplicável)
            chatHistory.push({ role: "model", parts: [{ text: text }] });
            return text;
        } else {
            console.warn('Resposta do Gemini não contém texto esperado:', result);
            return "Desculpe, não consegui gerar uma resposta clara. Poderia tentar de outra forma?";
        }
    } catch (error) {
        console.error('Erro ao chamar a API do Gemini:', error);
        return `Ocorreu um erro ao processar sua solicitação: ${error.message}. Por favor, tente novamente.`;
    }
}

// =========================
// Funções que agora usarão o Gemini para gerar as respostas
// =========================

async function gerarCurriculo(dados) {
    const prompt = `Gere um currículo completo e profissional com base nos seguintes dados. Inclua uma seção de "Sobre Mim" e formate de forma que seja fácil de ler.
    Nome: ${dados.nome || 'Não informado'}
    Idade: ${dados.idade || 'Não informada'}
    Cidade: ${dados.cidade || 'Não informada'}
    Objetivo: ${dados.objetivo || 'Não informado'}
    Formação: ${dados.formacao || 'Não informada'}
    Experiência: ${dados.experiencia || 'Não informada'}
    Habilidades: ${dados.habilidades || 'Não informadas'}
    Contato: ${dados.contato || 'Não informado'}
    `;
    return await callGemini(prompt);
}

async function buscarVagas(cidade) {
    const prompt = `Liste 3 a 5 vagas de emprego disponíveis na cidade de ${cidade || 'qualquer lugar'} para diversas áreas. Inclua o cargo, empresa e uma breve descrição. Formate como uma lista clara.`;
    return await callGemini(prompt);
}

async function iniciarEntrevista(chatHistory = []) {
    // Para simular entrevista, é crucial manter o histórico.
    // O frontend precisará enviar o chatHistory para o backend a cada turno.
    // Se for o primeiro turno, o prompt inicial. Se não, o histórico continua.
    const initialPrompt = "Vamos simular uma entrevista de emprego. Comece fazendo a primeira pergunta para o candidato.";
    
    // Se o histórico estiver vazio, comece com a pergunta inicial.
    // Caso contrário, o Gemini continuará a conversa com base no histórico fornecido.
    if (chatHistory.length === 0) {
        return await callGemini(initialPrompt);
    } else {
        // Se já houver histórico, o prompt será a última mensagem do usuário
        // e o Gemini usará o contexto do chatHistory para responder.
        // A função callGemini já adiciona o prompt atual e a resposta ao histórico.
        // Aqui, apenas garantimos que o histórico é passado corretamente.
        return await callGemini(chatHistory[chatHistory.length - 1].parts[0].text, chatHistory);
    }
}

async function avaliarCurriculo(texto) {
    const prompt = `Analise o seguinte currículo e forneça um feedback construtivo. Indique pontos fortes e áreas de melhoria, com sugestões específicas.
    Currículo:
    ${texto || 'Nenhum currículo fornecido.'}
    `;
    return await callGemini(prompt);
}

async function profissaoIdeal(gostos) {
    const prompt = `Com base nos seguintes interesses e habilidades, sugira 3 a 5 profissões ideais e explique brevemente por que elas se encaixam.
    Interesses/Habilidades: ${gostos || 'Não informado'}
    `;
    return await callGemini(prompt);
}

async function cursosGratuitos() {
    const prompt = `Liste 5 cursos online gratuitos de alta qualidade que são relevantes para o mercado de trabalho atual. Inclua o nome do curso, a plataforma e uma breve descrição.`;
    return await callGemini(prompt);
}

async function salarioJusto(cargo, cidade) {
    const prompt = `Qual seria uma estimativa de salário justo para o cargo de ${cargo || 'Não informado'} na cidade de ${cidade || 'Não informada'}? Considere a experiência média para esse cargo.`;
    return await callGemini(prompt);
}

async function jovemAprendiz(idade) {
    const prompt = `Explique o programa Jovem Aprendiz e quais são os requisitos de idade. Se a idade fornecida for ${idade}, diga se a pessoa está apta e o que ela deve fazer em seguida.`;
    return await callGemini(prompt);
}

async function boasVindas() {
    const prompt = `Crie uma mensagem de boas-vindas calorosa e encorajadora para um assistente de carreira inteligente chamado "IA do Emprego". Diga que ele está pronto para ajudar em diversas áreas e convide o usuário a começar.`;
    return await callGemini(prompt);
}

// =========================
// Rotas da API
// =========================

// Rota para servir o arquivo HTML principal na raiz do domínio
// Esta rota é agora mais explícita para garantir que o index.html seja servido
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.post('/botao', async (req, res) => {
    const { acao, dados, chatHistory } = req.body; // Adicionado chatHistory para simulação de entrevista

    try {
        let resposta;
        switch (acao) {
            case 'criar-curriculo':
                resposta = await gerarCurriculo(dados);
                break;
            case 'buscar-vagas':
                resposta = await buscarVagas(dados.cidade);
                break;
            case 'simular-entrevista':
                // Passa o histórico de chat para o Gemini para manter o contexto
                resposta = await iniciarEntrevista(chatHistory);
                break;
            case 'avaliar-curriculo':
                resposta = await avaliarCurriculo(dados.texto);
                break;
            case 'profissao-ideal':
                resposta = await profissaoIdeal(dados.gostos);
                break;
            case 'cursos-gratuitos':
                resposta = await cursosGratuitos();
                break;
            case 'salario-justo':
                resposta = await salarioJusto(dados.cargo, dados.cidade);
                break;
            case 'jovem-aprendiz':
                resposta = await jovemAprendiz(dados.idade);
                break;
            case 'boas-vindas':
            default:
                resposta = await boasVindas();
                break;
        }
        return res.json({ resposta: resposta }); // Usar .json() para enviar JSON
    } catch (error) {
        console.error('Erro na rota /botao:', error);
        return res.status(500).json({ erro: 'Ocorreu um erro no servidor.', detalhes: error.message });
    }
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`IA do Emprego rodando na porta ${PORT}!`);
});
