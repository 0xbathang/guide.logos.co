import * as fs from 'fs'
import * as fsp from 'fs/promises'
import fetch from 'node-fetch'
import * as path from 'path'
import { URL } from 'url'
import { DATA_DIR } from './config'

const EXCLUDE_COMPONENTS = [
  'BreadcrumbItem',
  'CardBody',
  'CardHeader',
  'CollapseHeader',
  'DropdownItem',
  'ModalBody',
  'ModalFooter',
  'TabItem',
  'TableItem',
  'TableRow',
  'Calendar',
  'TableBody',
  'TableHeader',
  'TooltipBase',
]

const STORYBOOK_URL = process.env.STORYBOOK_URL
const DOCS_DIR = path.join(DATA_DIR, '../docs')
const LSD_DOCS_DIR = path.join(DOCS_DIR, './resources-and-tools/lsd')
const COMPONENTS_DIR = path.join(LSD_DOCS_DIR, './components')
const DESIGN_TOKENS_DIR = path.join(LSD_DOCS_DIR, './design-tokens')

const generateDocs = async (metadata: any) => {
  const componentsDir = path.join(DATA_DIR, './components')
  const designTokensDir = path.join(DATA_DIR, './design-tokens')

  if (fs.existsSync(componentsDir))
    await fsp.rm(componentsDir, { recursive: true })

  if (fs.existsSync(designTokensDir))
    await fsp.rm(designTokensDir, { recursive: true })

  await fsp.mkdir(componentsDir)
  await fsp.mkdir(designTokensDir)

  await fsp.mkdir(LSD_DOCS_DIR, {
    recursive: true,
  })

  const components = metadata.components.filter(
    component => !EXCLUDE_COMPONENTS.includes(component.name),
  )

  for (const component of components) {
    const story =
      component.stories.find(s => s.name === 'Root') || component.stories[0]
    const storyId = story.id

    let doc = ''
    doc += `---\ntitle: ${component.name}\n---\n\n`
    doc += `import { StorybookDemo } from '@site/src/components/mdx/StorybookDemo';\n\n`
    doc += `# ${component.component.title}\n\n`
    doc += `<StorybookDemo name="${
      component.name
    }" storybookUrl="${STORYBOOK_URL}" docId="${storyId.replace(
      '--root',
      '--docs',
    )}" globalTypes={{}} componentProperties={[]} />\n`

    await fsp.writeFile(path.join(componentsDir, `${component.name}.mdx`), doc)
  }

  {
    const themeProvider = components.find(comp => comp.name === 'ThemeProvider')

    const root = themeProvider.stories.find(story => story.name === 'Root')
    const stories = themeProvider.stories.filter(story => story !== root)
    for (const story of stories) {
      let doc = ''

      doc += `---\ntitle: ${story.name}\n---\n\n`
      doc += `import { StorybookDemo } from '@site/src/components/mdx/StorybookDemo';\n\n`
      doc += `# ${story.name}\n\n`
      doc += `<StorybookDemo name="${story.name}" docId="${root.id.replace(
        '--root',
        '--docs',
      )}" storybookUrl="${STORYBOOK_URL}" storyId="${
        story.id
      }" globalTypes={{}} componentProperties={[]} />\n`

      await fsp.writeFile(path.join(designTokensDir, `${story.name}.mdx`), doc)
    }
  }

  if (fs.existsSync(COMPONENTS_DIR))
    await fsp.rm(COMPONENTS_DIR, { recursive: true })

  if (fs.existsSync(DESIGN_TOKENS_DIR))
    await fsp.rm(DESIGN_TOKENS_DIR, { recursive: true })

  await fsp.rename(componentsDir, COMPONENTS_DIR)
  await fsp.rename(designTokensDir, DESIGN_TOKENS_DIR)
}

export const run = async () => {
  const metadataUrl = new URL('/_metadata.json', STORYBOOK_URL)
  const response = await (await fetch(metadataUrl.toString())).json()

  await fsp.writeFile(
    path.join(__dirname, '../data', 'storybook.metadata.json'),
    JSON.stringify(response),
  )

  await generateDocs(response)
}
