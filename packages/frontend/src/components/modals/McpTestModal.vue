<template>
  <TransitionRoot as="template" :show="modelValue">
    <Dialog as="div" class="relative z-50" @close="onClose">
      <TransitionChild as="template" enter="ease-out duration-200" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-150" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/30" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild as="template" enter="ease-out duration-200" enter-from="opacity-0 translate-y-2 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-150" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-1 sm:scale-95">
            <DialogPanel class="w-full max-w-5xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl h-[70vh] min-h-0 flex flex-col">
              <DialogTitle class="text-lg font-medium text-gray-900">测试 MCP 服务</DialogTitle>
              <!-- Minimal usage hint: only show the MCP endpoint path -->
              <div class="mt-2 text-xs text-gray-600">
                MCP 接入路径：
                <span class="inline-flex items-center rounded border bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-800">{{ mcpRpcPath }}</span>
              </div>
              <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 min-h-0 flex-1">
                <!-- Left column: tool select + params + actions -->
                <div class="min-h-0 flex flex-col">
                  <div>
                    <label class="mb-1 block text-xs text-gray-600">选择工具</label>
                    <Listbox v-model="selectedName" as="div" class="relative" :disabled="loading || tools.length === 0">
                      <ListboxButton class="relative w-full rounded border bg-white py-1.5 pl-3 pr-8 text-left text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                        <span class="block truncate">{{ selectedName || '—' }}</span>
                        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronUpDownIcon class="h-4 w-4 text-gray-400" />
                        </span>
                      </ListboxButton>
                      <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white py-1 text-sm shadow-lg focus:outline-none">
                        <ListboxOption v-for="t in tools" :key="t.name" :value="t.name" v-slot="{ active, selected }">
                          <div :class="[active ? 'bg-gray-100' : 'bg-white', 'relative cursor-default select-none py-1.5 pl-8 pr-3']">
                            <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">{{ t.name }}</span>
                            <span v-if="selected" class="absolute inset-y-0 left-0 flex items-center pl-2 text-primary-600">
                              <CheckIcon class="h-4 w-4" />
                            </span>
                          </div>
                        </ListboxOption>
                      </ListboxOptions>
                    </Listbox>
                    <p class="mt-2 text-xs text-gray-600 min-h-[2rem] whitespace-pre-line">{{ currentTool?.description || '—' }}</p>
                  </div>

                  <div class="mt-4 min-h-0 flex-1 overflow-auto">
                    <label class="mb-1 block text-xs text-gray-600">输入参数</label>
                    <div v-if="schemaError" class="mb-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{{ schemaError }}</div>
                    <div v-if="currentSchema" class="space-y-3">
                      <template v-for="(conf, key) in fieldConfs" :key="key">
                        <div>
                          <label class="mb-1 block text-xs text-gray-600">
                            {{ key }}
                            <span v-if="conf.required" class="text-red-500">*</span>
                            <span v-if="conf.typeLabel" class="ml-1 text-[11px] text-gray-500">({{ conf.typeLabel }})</span>
                          </label>
                          <!-- string -->
                          <input v-if="conf.kind === 'string'" v-model="formState[key]" :placeholder="conf.placeholder" class="w-full rounded border px-3 py-2 text-sm" :disabled="loading" />
                          <!-- number/integer -->
                          <input v-else-if="conf.kind === 'number' || conf.kind === 'integer'" v-model.number="formState[key]" type="number" class="w-full rounded border px-3 py-2 text-sm" :disabled="loading" />
                          <!-- boolean -->
                          <select v-else-if="conf.kind === 'boolean'" v-model="formState[key]" class="w-full rounded border px-3 py-2 text-sm" :disabled="loading">
                            <option :value="true">true</option>
                            <option :value="false">false</option>
                          </select>
                          <!-- fallback: JSON input -->
                          <textarea v-else v-model="formStateJson[key]" rows="4" class="w-full rounded border px-3 py-2 text-sm font-mono" placeholder="请输入 JSON" :disabled="loading"></textarea>
                          <p v-if="fieldErrors[key]" class="mt-1 text-xs text-red-600">{{ fieldErrors[key] }}</p>
                          <p v-else-if="conf.description" class="mt-1 text-[11px] text-gray-500">{{ conf.description }}</p>
                        </div>
                      </template>
                    </div>
                    <div v-else class="text-xs text-gray-500">该工具不需要参数或 schema 未提供。</div>
                  </div>

                  <div class="mt-4 flex items-center justify-between">
                    <div class="text-xs text-gray-500">{{ loading ? '加载中...' : (tools.length ? `已加载 ${tools.length} 个工具` : '未加载到工具') }}</div>
                    <div class="flex items-center gap-2">
                      <button type="button" class="rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" @click="onClose" :disabled="loading">关闭</button>
                      <button type="button" class="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60" :disabled="loading || !selectedName || hasErrors" @click="onInvoke">{{ loading ? '处理中...' : '调用' }}</button>
                    </div>
                  </div>
                </div>

                <!-- Right column: result preview -->
                <div class="min-h-0 h-full flex flex-col">
                  <label class="mb-1 block text-sm font-medium text-gray-800">返回结果</label>
                  <div class="rounded border bg-gray-50 p-3 flex-1 overflow-auto">
                    <pre v-if="resultText" class="text-xs whitespace-pre-wrap">{{ resultText }}</pre>
                    <div v-else class="text-xs text-gray-500">尚未调用</div>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot, Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue'
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/vue/20/solid'
import { toolsList, callTool } from '@/mcp/rpc'

type JsonSchema = any

const props = defineProps<{
  modelValue: boolean
  projectId: string
  // 可选：用于预填充 names 类字段
  hintNames?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const loading = ref(false)
const tools = ref<Array<{ name: string; description?: string; inputSchema?: JsonSchema }>>([])
const selectedName = ref<string>('')
const resultText = ref('')
const schemaError = ref('')

const currentTool = computed(() => tools.value.find((t) => t.name === selectedName.value) || null)
// MCP endpoint path for this project (no domain)
const mcpRpcPath = computed(() => `/api/projects/${props.projectId}/mcp-rpc`)
const currentSchema = computed<JsonSchema | null>(() => currentTool.value?.inputSchema || null)

// 动态表单状态
const formState = reactive<Record<string, any>>({})
const formStateTextArea = reactive<Record<string, string>>({})
const formStateJson = reactive<Record<string, string>>({})
const fieldErrors = reactive<Record<string, string>>({})

type FieldConf = {
  kind: 'string' | 'number' | 'integer' | 'boolean' | 'json'
  required: boolean
  description?: string
  placeholder?: string
  typeLabel?: string
}
const fieldConfs = ref<Record<string, FieldConf>>({})

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    // reset
    loading.value = true
    tools.value = []
    selectedName.value = ''
    resultText.value = ''
    schemaError.value = ''
    fieldConfs.value = {}
    Object.keys(formState).forEach((k) => delete formState[k])
    Object.keys(formStateTextArea).forEach((k) => delete formStateTextArea[k])
    Object.keys(formStateJson).forEach((k) => delete formStateJson[k])
    Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k])
    try {
      const list = await toolsList(props.projectId)
      tools.value = Array.isArray(list?.tools) ? list.tools : Array.isArray(list) ? list : []
      if (tools.value.length) {
        selectedName.value = tools.value[0].name
      }
    } catch (e: any) {
      resultText.value = `加载工具失败: ${e?.message || e}`
    } finally {
      loading.value = false
    }
  },
  { immediate: false }
)

watch(
  () => selectedName.value,
  async () => {
    buildFormBySchema()
  }
)

function onClose() {
  if (loading.value) return
  emit('update:modelValue', false)
}

function buildFormBySchema() {
  schemaError.value = ''
  fieldConfs.value = {}
  // clear states
  Object.keys(formState).forEach((k) => delete formState[k])
  Object.keys(formStateTextArea).forEach((k) => delete formStateTextArea[k])
  Object.keys(formStateJson).forEach((k) => delete formStateJson[k])
  Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k])

  const schema = currentSchema.value
  if (!schema) return
  try {
    if (schema.type === 'object' && schema.properties) {
      const req: string[] = Array.isArray(schema.required) ? schema.required : []
      for (const key of Object.keys(schema.properties)) {
        const prop = schema.properties[key]
        const required = req.includes(key)
        let kind: FieldConf['kind'] = 'json'
        // Simple inference
        if (prop.type === 'string') kind = 'string'
        else if (prop.type === 'number') kind = 'number'
        else if (prop.type === 'integer') kind = 'integer'
        else if (prop.type === 'boolean') kind = 'boolean'
        // derive type label
        const typeLabel = (() => {
          if (prop.type === 'array') {
            const it = prop.items && prop.items.type ? String(prop.items.type) : ''
            return it ? `array<${it}>` : 'array'
          }
          if (prop.type) return String(prop.type)
          return 'unknown'
        })()
        fieldConfs.value[key] = {
          kind,
          required,
          description: prop.description || '',
          placeholder: prop.placeholder || '',
          typeLabel
        }
        // init value
        if (kind === 'boolean') {
          formState[key] = false
        } else if (kind === 'string') {
          formState[key] = ''
        } else if (kind === 'number' || kind === 'integer') {
          formState[key] = 0
        } else {
          // JSON-defaults for complex or unspecified types
          if (prop.type === 'array') {
            if (prop.items && prop.items.type === 'string') {
              const hint = key === 'names' ? (props.hintNames || ['']) : ['']
              formStateJson[key] = JSON.stringify(hint)
            } else {
              formStateJson[key] = '[]'
            }
          } else if (prop.type === 'object') {
            formStateJson[key] = '{}'
          } else {
            formStateJson[key] = ''
          }
        }
      }
    } else {
      // Fallback: raw JSON area
      fieldConfs.value = { _raw: { kind: 'json', required: false } }
      formStateJson['_raw'] = ''
    }
  } catch (e: any) {
    schemaError.value = `解析输入 Schema 失败: ${e?.message || e}`
  }
}

const hasErrors = computed(() => Object.values(fieldErrors).some(Boolean))

function validateAndBuildArgs(): any | null {
  const confs = fieldConfs.value
  const args: Record<string, any> = {}
  for (const key of Object.keys(confs)) {
    const conf = confs[key]
    fieldErrors[key] = ''
    if (conf.kind === 'string') {
      const v = String(formState[key] ?? '').trim()
      if (conf.required && !v) {
        fieldErrors[key] = '必填'
        continue
      }
      if (v) args[key] = v
    } else if (conf.kind === 'number' || conf.kind === 'integer') {
      const raw = formState[key]
      const v = Number(raw)
      if (conf.required && (raw === '' || raw === null || Number.isNaN(v))) {
        fieldErrors[key] = '必填数字'
        continue
      }
      if (!Number.isNaN(v)) args[key] = v
    } else if (conf.kind === 'boolean') {
      args[key] = !!formState[key]
    } else if (conf.kind === 'json') {
      const text = String(formStateJson[key] || '').trim()
      if (conf.required && !text) {
        fieldErrors[key] = '必填（JSON）'
        continue
      }
      if (text) {
        try {
          args[key] = JSON.parse(text)
        } catch (e) {
          fieldErrors[key] = 'JSON 格式错误'
          continue
        }
      }
    }
  }
  // Return null if any error exists
  if (Object.values(fieldErrors).some(Boolean)) return null
  return args
}

async function onInvoke() {
  if (!selectedName.value) return
  const args = validateAndBuildArgs()
  if (!args) return
  loading.value = true
  resultText.value = ''
  try {
    const res = await callTool(props.projectId, selectedName.value, args)
    // Prefer readable text when MCP returns content array
    const content = (res && (res as any).content) || null
    if (Array.isArray(content) && content.length && content[0]?.text) {
      resultText.value = String(content[0].text)
    } else {
      resultText.value = JSON.stringify(res, null, 2)
    }
  } catch (e: any) {
    resultText.value = `调用失败: ${e?.message || e}`
  } finally {
    loading.value = false
  }
}
</script>

<!-- Style inherits global Tailwind setup -->
