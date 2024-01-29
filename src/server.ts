import express, { Request, Response } from 'express'
import { OpenAI } from 'openai'

import openaiConfig from './openaiConfig'
import admin from 'firebase-admin'
import serviceAccount from './firebaseAdmin.json'
import cors from 'cors'
import { DEFAULT_PROMPT } from './prompt'
import { Assistant } from 'openai/resources/beta/assistants/assistants'
import { Thread } from 'openai/resources/beta/threads/threads'
import { ThreadMessage, ThreadMessagesPage } from 'openai/resources/beta/threads/messages/messages'
import { Run } from 'openai/resources/beta/threads/runs/runs'

admin.initializeApp({
  credential: admin.credential.cert({
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
    projectId: serviceAccount.project_id
  })
})

// Initialize OpenAI
const openai = new OpenAI(openaiConfig)
const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use(express.json())

async function checkIfAuthenticated(req: Request, res: Response) {
  let userInfo: Record<string, any> | null = null
  try {
    const authToken = req.headers.authorization
    if (authToken) {
      userInfo = await admin.auth().verifyIdToken(authToken)
    } else {
      res.status(401).send({ error: 'Missing token in request headers' })
    }
  } catch (e) {
    res.status(401).send({ error: 'You are not authorized to make this request' })
  }
  return userInfo
}

app.post('/assistants/create', async (req, res) => {
  if (await checkIfAuthenticated(req, res)) {
    try {
      const assistant: Assistant = await openai.beta.assistants.create({
        name: 'Cook Tutor',
        instructions: DEFAULT_PROMPT,
        model: 'gpt-3.5-turbo'
      })
      res.json(assistant)
    } catch (error) {
      res.status(500).json(error)
    }
  }
})

app.post('/threads/create', async (req, res) => {
  if (await checkIfAuthenticated(req, res)) {
    try {
      const tread: Thread = await openai.beta.threads.create()
      res.json(tread)
    } catch (error) {
      res.status(500).json(error)
    }
  }
})

app.post('/threads/messages/create', async (req, res) => {
  if (await checkIfAuthenticated(req, res)) {
    try {
      const message: ThreadMessage = await openai.beta.threads.messages.create(req.body.threadId, {
        role: 'user',
        content: req.body.message
      })
      res.json(message)
    } catch (error) {
      res.status(500).json(error)
    }
  }
})

app.post('/threads/messages/list', async (req, res) => {
  if (await checkIfAuthenticated(req, res)) {
    try {
      const list: ThreadMessagesPage = await openai.beta.threads.messages.list(req.body.threadId)
      res.json(list)
    } catch (error) {
      res.status(500).json(error)
    }
  }
})

app.post('/threads/runs/create', async (req, res) => {
  if (await checkIfAuthenticated(req, res)) {
    try {
      const run: Run = await openai.beta.threads.runs.create(req.body.threadId, {
        assistant_id: req.body.assistantId,
        instructions: DEFAULT_PROMPT
      })
      res.json(run)
    } catch (error) {
      res.status(500).json(error)
    }
  }
})

app.post('/threads/runs/retrieve', async (req, res) => {
  if (await checkIfAuthenticated(req, res)) {
    try {
      const run = await openai.beta.threads.runs.retrieve(req.body.threadId, req.body.runId)
      res.json(run)
    } catch (error) {
      res.status(500).json(error)
    }
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
