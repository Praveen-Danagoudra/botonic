import os from 'os'
import colors from 'colors'
import path from 'path'
import Database from 'sqlite-async'
import {
  DB,
  GLOBAL_CONFIG_DIRNAME,
  WORD_EMBEDDINGS_DIRNAME,
  WORD_EMBEDDDINGS_ENDPOINT,
} from './constants'
import { pathExists, createDir, downloadFileToDisk } from './file-utils'

async function downloadWordEmbeddingsFile(
  wordEmbeddingsPath,
  wordEmbeddingsFileName
) {
  console.log(colors.blue(`Downloading '${wordEmbeddingsFileName}'...`))
  console.log(`Please, wait until the download finishes.\n`)
  const downloadPath = path.join(wordEmbeddingsPath, wordEmbeddingsFileName)
  await downloadFileToDisk({
    url: `${WORD_EMBEDDDINGS_ENDPOINT}/${wordEmbeddingsFileName}`,
    downloadPath,
  })
}

export async function getEmbeddingMatrix({
  vocabulary,
  vocabularyLength,
  params,
}) {
  const wordEmbeddingsFileName = `${params.EMBEDDING}-${params.EMBEDDING_DIM}d-${params.language}.db`
  const wordEmbeddingsPath = path.join(
    os.homedir(),
    GLOBAL_CONFIG_DIRNAME,
    WORD_EMBEDDINGS_DIRNAME
  )
  const wordEmbeddingsFilePath = path.join(
    wordEmbeddingsPath,
    wordEmbeddingsFileName
  )
  if (!pathExists(wordEmbeddingsFilePath)) {
    console.log(
      colors.red(
        `The file '${wordEmbeddingsFileName}' was not found in your machine.`
      )
    )
    console.log('An automatic download will start in brief.')
    if (!pathExists(wordEmbeddingsPath)) {
      createDir(wordEmbeddingsPath)
    }
    await downloadWordEmbeddingsFile(wordEmbeddingsPath, wordEmbeddingsFileName)
  }
  const embeddingMatrix = await generateEmbeddingMatrix({
    dim1: vocabularyLength,
    dim2: params.EMBEDDING_DIM,
    vocabulary,
    wordEmbeddingsFilePath,
  })
  return embeddingMatrix
}

export async function generateEmbeddingMatrix({
  dim1,
  dim2,
  vocabulary,
  wordEmbeddingsFilePath,
}) {
  let embeddingMatrix = createEmbeddingMatrix(dim1, dim2)
  embeddingMatrix = await fillEmbeddingMatrix(
    vocabulary,
    embeddingMatrix,
    wordEmbeddingsFilePath
  )
  return embeddingMatrix
}

function createEmbeddingMatrix(dim1, dim2) {
  const min = -1
  const max = 1
  const matrix = []
  for (let i = 0; i < dim1; i++) {
    matrix[i] = new Array(dim2)
    for (let j = 0; j < dim2; j++) {
      matrix[i][j] = Math.random() * (max - min) + min
    }
  }
  return matrix
}

async function fillEmbeddingMatrix(
  vocabulary,
  embeddingMatrix,
  wordEmbeddingsFilePath
) {
  let out_of_embedding = 0
  const db = await Database.open(wordEmbeddingsFilePath)
  for (const [word, index] of Object.entries(vocabulary)) {
    if (index == 0) {
      continue // SKIP UNK TOKEN
    }
    let res = null
    let d = "'"
    if (word.includes("'")) {
      d = '"'
    }
    try {
      res = await db.get(
        `SELECT * FROM ${DB.TABLE} where ${DB.COLUMN}=${d}${word}${d}`
      )
      embeddingMatrix[index] = res.vector.split(' ')
    } catch (e) {
      console.log('Not found: [', word, '] Index: ', index)
      out_of_embedding++
    }
  }
  await db.close()
  console.log('Words not found in embedding: ', out_of_embedding)
  return embeddingMatrix
}
