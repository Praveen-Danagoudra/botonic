import {
  CsvImport,
  ReferenceFieldDuplicator,
  StringFieldImporter,
} from './csv-import'
import { ManageContentful } from '../../contentful/manage'
import { ManageContext } from '../../manage-cms'
import { ContentfulOptions } from '../../plugin'
import { isOfType } from '../../util/enums'
import { Contentful } from '../../contentful'

async function readCsvForTranslators(
  contentfulOptions: ContentfulOptions,
  context: ManageContext,
  fname: string
) {
  const manageCms = new ManageContentful(contentfulOptions)
  const fieldImporter = new StringFieldImporter(manageCms, context)
  const importer = new CsvImport(fieldImporter)
  await importer.import(fname)
}

export enum ImportType {
  DRY = 'DRY', //parse files but do write to CM
  NO_OVERWRITE = 'NO_OVERWRITE', // publishes the content, but fails if fields for this locale already have value
  OVERWRITE = 'OVERWRITE', // modifies previous value, but leaves it in UNPUBLISHED state
  OVERWRITE_AND_PUBLISH = 'OVERWRITE_AND_PUBLISH', // overwrites previous value and publishes it (only for new spaces)
}

if (process.argv.length < 10 || process.argv[2] == '--help') {
  console.error(
    `Usage: space_id environment delivery_token mgmnt_token locale filename [${Object.values(
      ImportType
    ).join('|')}] duplicate_references`
  )
  // eslint-disable-next-line no-process-exit
  process.exit(1)
}

const spaceId = process.argv[2]
const environment = process.argv[3]
const deliverAccessToken = process.argv[4]
const manageAccessToken = process.argv[5]
const locale = process.argv[6]
const fileName = process.argv[7]
const importType = String(process.argv[8])
if (!isOfType(importType, ImportType)) {
  throw Error(`${importType} is not a valid value`)
}
const duplicateReferences =
  process.argv[9] == 'true'
    ? true
    : process.argv[9] == 'false'
    ? false
    : undefined
if (duplicateReferences == undefined) {
  throw Error("duplicateReferences argument must be 'true' or 'false'")
}

async function main() {
  try {
    if (importType == ImportType.NO_OVERWRITE) {
      console.warn(
        'Contents will be left in preview mode. Publish them from contentful.com'
      )
    }
    const manageOptions = {
      spaceId,
      accessToken: manageAccessToken,
      environment,
    }
    const manageContext = {
      locale,
      preview: importType == ImportType.OVERWRITE,
      dryRun: importType == ImportType.DRY,
      allowOverwrites: [
        ImportType.OVERWRITE,
        ImportType.OVERWRITE_AND_PUBLISH,
      ].includes(importType as ImportType),
    }

    await readCsvForTranslators(manageOptions, manageContext, fileName)
    if (duplicateReferences) {
      console.log('Duplicating reference fields')
      await duplicateReferenceFields(
        manageOptions,
        {
          spaceId,
          accessToken: deliverAccessToken,
          environment,
        },
        manageContext
      )
    }
    console.log('done')
  } catch (e) {
    console.error(e)
  }
  if (importType == ImportType.OVERWRITE) {
    console.log(
      "Remember that you'll need to publish the changed contents from contentful.com"
    )
  }
}

async function duplicateReferenceFields(
  manageOptions: ContentfulOptions,
  deliverOptions: ContentfulOptions,
  manageContext: ManageContext
) {
  const manageCms = new ManageContentful(manageOptions)
  const cms = new Contentful(deliverOptions)
  const referenceDuplicator = new ReferenceFieldDuplicator(
    cms,
    manageCms,
    manageContext
  )
  await referenceDuplicator.duplicateReferenceFields()
  await referenceDuplicator.duplicateAssetFiles()
}

// void tells linters that we don't want to wait for promise
// await in main requires esnext
void main()
