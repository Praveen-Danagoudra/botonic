import {
  BOTONIC_CONTENT_TYPES,
  Button,
  CMS,
  CommonFields,
  Content,
  Element,
  StartUp,
  TopContent,
} from '../../index'
import { Locale } from '../../nlp'
import { Text } from '../../cms'
import stringify from 'csv-stringify'
import * as stream from 'stream'
import * as fs from 'fs'
import { promisify } from 'util'
import sort from 'sort-stream'

const finished = promisify(stream.finished)

class I18nField {
  constructor(readonly name: string, readonly value: string) {}
}

type CsvLine = string[]

interface CsvExportOptions {
  readonly nameFilter?: (name: string) => boolean
  readonly stringFilter?: (text: string) => boolean
}

export const skipEmptyStrings = (str: string) => Boolean(str && str.trim())
/***
 * Uses https://csv.js.org/stringify/api/
 */
export class CsvExport {
  private toFields: ContentToCsvLines

  constructor(private readonly options: CsvExportOptions) {
    this.toFields = new ContentToCsvLines(options)
  }

  create_stringifier() {
    return stringify({
      escape: '"',
      delimiter: ';',
      quote: '"',
      quoted: true,
      record_delimiter: 'windows',
      header: true,
      columns: ['Model', 'Code', 'Id', 'Field', 'From', 'To'],
    })
  }

  static sortRows(a: string[], b: string[]): number {
    for (const i in a) {
      const cmp = a[i].localeCompare(b[i])
      if (cmp != 0) {
        return cmp
      }
    }
    return 0
  }

  async write(fname: string, cms: CMS, locale: Locale): Promise<void> {
    const stringifier = this.create_stringifier()
    const readable = stream.Readable.from(this.generate(cms, locale))
    const writable = readable
      .pipe(sort(CsvExport.sortRows))
      .pipe(stringifier)
      .pipe(fs.createWriteStream(fname))
    return this.toPromise(writable)
  }

  async toPromise(writable: stream.Writable): Promise<void> {
    return finished(writable)
  }

  async *generate(cms: CMS, from: Locale): AsyncGenerator<string[]> {
    for (const model of [...MESSAGE_TYPES, ContentType.BUTTON]) {
      const contents = await cms.contents(model, { locale: from })
      for (const content of contents) {
        if (this.options.nameFilter && !this.options.nameFilter(content.name)) {
          continue
        }
        console.log('Exporting content', content.name.trim() || content.id)
        for (const field of this.toFields.getCsvLines(content)) {
          const TO_COLUMN = ''
          yield [...field, TO_COLUMN]
        }
      }
    }
  }
}

export class ContentToCsvLines {
  constructor(private readonly options: CsvExportOptions) {}

  getCsvLines(content: Content): CsvLine[] {
    const columns = [content.contentType, content.name, content.id]
    let fields = this.getFields(content)
    if (this.options.stringFilter) {
      fields = fields.filter(f => this.options.stringFilter!(f.value))
    }
    return fields.map(f => [...columns, f.name, f.value!])
  }

  getFields(content: Content): I18nField[] {
    if (content instanceof Button) {
      return [new I18nField('Text', content.text)]
    } else if (content instanceof StartUp) {
      return [
        ...this.getCommonFields(content.common),
        new I18nField('Text', content.text),
      ]
    } else if (content instanceof Text) {
      return [
        ...this.getCommonFields(content.common),
        new I18nField('Text', content.text),
      ]
    } else if (content instanceof Element) {
      return [
        new I18nField('Title', content.title),
        new I18nField('Subtitle', content.subtitle),
      ]
    } else if (content instanceof TopContent) {
      return this.getCommonFields(content.common)
    }
    return []
  }

  getCommonFields(common: CommonFields): I18nField[] {
    return [new I18nField('Short text', common.shortText)]
  }
}