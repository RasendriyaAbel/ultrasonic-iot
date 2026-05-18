/**
 * Bangun model TFJS dari bobot Keras (scripts/smart_water_weights.json)
 * SmartWater_BiLSTM_57L — input 60×27
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as tf from '@tensorflow/tfjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const WEIGHTS_PATH = path.join(__dirname, 'smart_water_weights.json')
const OUT_DIR = path.join(ROOT, 'public', 'models', 'best-water')
const SEQ_LEN = 60
const FEATURE_DIM = 27

function loadWeights() {
  if (!fs.existsSync(WEIGHTS_PATH)) {
    throw new Error(
      `Missing ${WEIGHTS_PATH}. Run: python scripts/export_smart_water_weights.py`,
    )
  }
  const raw = JSON.parse(fs.readFileSync(WEIGHTS_PATH, 'utf8'))
  return raw.weights ?? raw
}

function tensor2d(data, rows, cols) {
  return tf.tensor2d(data, [rows, cols])
}

function tensor1d(data) {
  return tf.tensor1d(data)
}

function setLstmCellWeights(lstmLayer, kernel, recurrent, bias) {
  lstmLayer.setWeights([
    tensor2d(kernel, kernel.length, kernel[0].length),
    tensor2d(recurrent, recurrent.length, recurrent[0].length),
    tensor1d(bias),
  ])
}

function buildModel() {
  const input = tf.input({ shape: [SEQ_LEN, FEATURE_DIM], name: 'input_sequence' })

  const bilstm1 = tf.layers.bidirectional({
    name: 'bilstm_1',
    mergeMode: 'concat',
    layer: tf.layers.lstm({
      units: 128,
      returnSequences: true,
      name: 'forward_lstm',
    }),
  })
  let x = bilstm1.apply(input)
  x = tf.layers.dropout({ rate: 0.3, name: 'dropout_1' }).apply(x)

  const bilstm2 = tf.layers.bidirectional({
    name: 'bilstm_2',
    mergeMode: 'concat',
    layer: tf.layers.lstm({
      units: 64,
      returnSequences: false,
      name: 'forward_lstm_1',
    }),
  })
  x = bilstm2.apply(x)
  x = tf.layers.dropout({ rate: 0.3, name: 'dropout_2' }).apply(x)

  const shared = tf.layers.dense({ units: 32, activation: 'relu', name: 'dense_shared' }).apply(x)
  const normed = tf.layers
    .batchNormalization({ name: 'batch_norm', epsilon: 1e-3, momentum: 0.99 })
    .apply(shared)

  const output_pump_on = tf.layers
    .dense({ units: 1, activation: 'sigmoid', name: 'output_pump_on' })
    .apply(normed)
  const output_total_used = tf.layers
    .dense({ units: 1, activation: 'linear', name: 'output_total_used' })
    .apply(normed)
  const output_activity = tf.layers
    .dense({ units: 10, activation: 'softmax', name: 'output_activity' })
    .apply(normed)

  const model = tf.model({
    inputs: input,
    outputs: [output_pump_on, output_total_used, output_activity],
  })

  return { model, bilstm1, bilstm2 }
}

function assignWeights(model, bilstm1, bilstm2, w) {
  const lstm1Forward = bilstm1.forwardLayer
  const lstm1Backward = bilstm1.backwardLayer
  const lstm2Forward = bilstm2.forwardLayer
  const lstm2Backward = bilstm2.backwardLayer

  setLstmCellWeights(
    lstm1Forward,
    w.bilstm_1_forward_kernel,
    w.bilstm_1_forward_recurrent,
    w.bilstm_1_forward_bias,
  )
  setLstmCellWeights(
    lstm1Backward,
    w.bilstm_1_backward_kernel,
    w.bilstm_1_backward_recurrent,
    w.bilstm_1_backward_bias,
  )
  setLstmCellWeights(
    lstm2Forward,
    w.bilstm_2_forward_kernel,
    w.bilstm_2_forward_recurrent,
    w.bilstm_2_forward_bias,
  )
  setLstmCellWeights(
    lstm2Backward,
    w.bilstm_2_backward_kernel,
    w.bilstm_2_backward_recurrent,
    w.bilstm_2_backward_bias,
  )

  const denseShared = model.getLayer('dense_shared')
  denseShared.setWeights([
    tensor2d(w.dense_shared_kernel, w.dense_shared_kernel.length, w.dense_shared_kernel[0].length),
    tensor1d(w.dense_shared_bias),
  ])

  const batchNorm = model.getLayer('batch_norm')
  batchNorm.setWeights([
    tensor1d(w.batch_norm_gamma),
    tensor1d(w.batch_norm_beta),
    tensor1d(w.batch_norm_moving_mean),
    tensor1d(w.batch_norm_moving_variance),
  ])

  model.getLayer('output_pump_on').setWeights([
    tensor2d(
      w.output_pump_on_kernel,
      w.output_pump_on_kernel.length,
      w.output_pump_on_kernel[0].length,
    ),
    tensor1d(w.output_pump_on_bias),
  ])
  model.getLayer('output_total_used').setWeights([
    tensor2d(
      w.output_total_used_kernel,
      w.output_total_used_kernel.length,
      w.output_total_used_kernel[0].length,
    ),
    tensor1d(w.output_total_used_bias),
  ])
  model.getLayer('output_activity').setWeights([
    tensor2d(
      w.output_activity_kernel,
      w.output_activity_kernel.length,
      w.output_activity_kernel[0].length,
    ),
    tensor1d(w.output_activity_bias),
  ])
}

async function main() {
  const w = loadWeights()
  const { model, bilstm1, bilstm2 } = buildModel()
  assignWeights(model, bilstm1, bilstm2, w)

  const sample = tf.zeros([1, SEQ_LEN, FEATURE_DIM])
  const outputs = model.predict(sample)
  for (const t of outputs) t.dispose()
  sample.dispose()

  fs.mkdirSync(OUT_DIR, { recursive: true })

  await model.save(
    tf.io.withSaveHandler(async (artifacts) => {
      const weightsData = artifacts.weightData
      if (weightsData instanceof ArrayBuffer) {
        fs.writeFileSync(path.join(OUT_DIR, 'weights.bin'), Buffer.from(weightsData))
      } else if (Array.isArray(weightsData)) {
        const total = weightsData.reduce((n, b) => n + b.byteLength, 0)
        const merged = new Uint8Array(total)
        let offset = 0
        for (const buf of weightsData) {
          merged.set(new Uint8Array(buf), offset)
          offset += buf.byteLength
        }
        fs.writeFileSync(path.join(OUT_DIR, 'weights.bin'), Buffer.from(merged))
      }

      const manifest = artifacts.weightSpecs.map((spec, idx) => {
        if (idx === 0) {
          return { ...spec, paths: ['weights.bin'] }
        }
        return spec
      })

      const modelTopology = {
        ...artifacts.modelTopology,
        weightsManifest: [{ paths: ['weights.bin'], weights: manifest }],
      }

      fs.writeFileSync(
        path.join(OUT_DIR, 'model.json'),
        JSON.stringify({
          format: artifacts.format,
          generatedBy: artifacts.generatedBy,
          convertedBy: artifacts.convertedBy,
          modelTopology,
          weightsManifest: [{ paths: ['weights.bin'], weights: manifest }],
        }),
      )

      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON',
        },
      }
    }),
  )

  model.dispose()
  console.log(`Saved TFJS model to ${OUT_DIR} (${SEQ_LEN}×${FEATURE_DIM})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
