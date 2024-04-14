import fastify from "fastify";
import { z } from "zod";
import { sql } from "./lib/postgres";
import postgres from "postgres";
import { redis } from "./lib/redis";


const app = fastify();

//rota do link short 
//http://localhost:3333/teste9
app.get('/:code',  async (request, reply) => {
  const getLinkSchema = z.object({
    code: z.string().min(4),
  })

  const { code } = getLinkSchema.parse(request.params)

  const result = await sql/*sql*/`
  SELECT id, original_url
  FROM short_links
  WHERE short_links.code = ${code}

  `
 // return result

 if (result.length === 0) {
  return reply.status(400).send({ message: 'Link not found.' })
}

const link = result[0]

//ver o ranking do projeto, o link mais acessado:
await redis.zIncrBy('metrics', 1, String(link.id))



//301 = permanente
//302 = temporario

return reply.redirect(301, link.original_url) 

} )



//criar rota de listagem de links
// ### GET http://localhost:3333/api/links
app.get('/api/links', async () => {
  const result = await sql /*sql*/`
  SELECT *
  FROM short_links
  ORDER BY created_at DESC  
  `
  return result
})


/*POST http://localhost:3333/links
Content-Type: application/json

{
  "code": "teste9",
  "url": "https://rocketseat.com.br"
}
*/

// POST é usado para enviar dados ao servidor para criar um novo recurso.
// Criar um novo link
app.post("/api/links", async (request, reply) => {
  const createLinkSchema = z.object({
    code: z.string().min(4),
    url: z.string().url(),
  });

  const { code, url } = createLinkSchema.parse(request.body);
  try {
    const result = await sql/*sql*/ `
    INSERT INTO short_links (code, original_url)
    VALUES (${code}, ${url})
    RETURNING id
  `;
    const link = result[0];

    // A resposta JSON deve estar no formato correto
    return reply.status(201).send({ shortLinkId: link.id });
  } catch (err) {
    if (err instanceof postgres.PostgresError) {
      if (err.code === '23305') {
        return reply.status(400).send({ message: 'Duplicated code!!!' });
      }
    }

    console.error(err)
    return reply.status(500).send({message: 'Internal error....'})
  }
});


//Rota de metricas links mais acessados da aplicacao (redis)
app.get('/api/metrics', async() => {
  const result = await redis.zRangeByScoreWithScores('metrics', 0, 50)

  const metrics = result
  .sort((a, b) => b.score - a.score)
  .map(item => {
    return{
      shortLinkId: Number(item.value),
      clicks: item.score,
    }
  })
  return result
})







// GET = solicitar dados de um recurso específico no servidor.
/*
app.get('/test', () => {
  return 'Hello Wordddd 🥰'
})*/

// PUT método usado para atualizar um recurso específico no servidor com os dados fornecidos.
app
  .listen({
    port: 3333,
  })
  .then(() => {
    console.log("HTTP server running!!😎");
  });
