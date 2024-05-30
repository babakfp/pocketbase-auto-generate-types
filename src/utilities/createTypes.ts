import type { CollectionModel, SchemaField } from "pocketbase"
import { toPascalCase } from "../helpers/toPascalCase.js"

const createCollectionRecordTypes = () => {
    const types: string[] = []

    const fieldTypeToTs = (field: SchemaField) => {
        if (
            field.type === "date" ||
            field.type === "text" ||
            field.type === "email" ||
            field.type === "url" ||
            field.type === "editor"
        ) {
            return "string"
        }

        if (field.type === "number") {
            return "number"
        }

        if (field.type === "bool") {
            return "boolean"
        }

        if (field.type === "json") {
            return ["unknown", "null"].join(" | ")
        }

        if (field.type === "file" || field.type === "relation") {
            return field.options.maxSelect > 1 ? "string[]" : "string"
        }

        if (field.type === "select") {
            return field.options.values
                .map((value: string) => JSON.stringify(value))
                .join(" | ") as string
        }

        return "unknown"
    }

    const add = (c: CollectionModel) => {
        const props: string[] = []

        c.schema.forEach((field) => {
            const name = field.name
            const required = field.required ? "" : "?"
            const type = fieldTypeToTs(field)

            props.push(`    ${name}${required}: ${type}`)
        })

        const name = toPascalCase(c.name)

        types.push([`export type ${name}Record = {`, ...props, "}"].join("\n"))
    }

    const get = () => {
        return types.join("\n\n")
    }

    return { add, get }
}

const createCollectionRecordTypesList = () => {
    const types: string[] = []

    const add = (c: CollectionModel) => {
        types.push(`    ${c.name}: ${toPascalCase(c.name)}Record`)
    }

    const get = () => {
        return ["export type CollectionRecords = {", ...types, "}"].join("\n")
    }

    return { add, get }
}

const createCollectionResponseTypes = () => {
    let types: string[] = []

    const add = (collection: CollectionModel) => {
        const name = toPascalCase(collection.name)
        const model = collection.type === "auth" ? "AuthModel" : "RecordModel"

        types.push(
            `export type ${name}Response<Texpand = unknown> = Required<${name}Record> & ${model}<Texpand>`,
        )
    }

    const get = () => {
        return types.join("\n")
    }

    return { add, get }
}

const createCollectionResponseTypesList = () => {
    const types: string[] = []

    const add = (c: CollectionModel) => {
        types.push(`    ${c.name}: ${toPascalCase(c.name)}Response`)
    }

    const get = () => {
        return ["export type CollectionResponses = {", ...types, "}"].join("\n")
    }

    return { add, get }
}

const createPocketbaseType = () => {
    let types: string[] = []

    const add = (collection: CollectionModel) => {
        const name = toPascalCase(collection.name)

        types.push(
            `    collection<Texpand = unknown>(idOrName: "${collection.name}"): RecordService<${name}Response<Texpand>>`,
        )
    }

    const get = () =>
        ["export type PocketBase = PocketBase_ & {", ...types, "}"].join("\n")

    return { add, get }
}

export const createTypes = (collections: CollectionModel[]) => {
    const typesFileContent = [
        `/*
    NOTE: This file is auto-generated by https://www.npmjs.com/package/pocketbase-auto-generate-types.
    IMPORTANT: Do not edit this file manually.
*/

import { type default as PocketBase_ } from "pocketbase"
import type { RecordService } from "pocketbase"

export type BaseModel = {
    id: string
    created: string
    updated: string
}

export type RecordModel<T = never> = BaseModel & {
    collectionId: string
    collectionName: string
    expand?: T
}

export type AuthModel<T = never> = RecordModel<T> & {
    username: string
    email: string
    emailVisibility: boolean
    verified: boolean
}`,
    ]

    const types = createCollectionRecordTypes()
    const collectionRecordTypesList = createCollectionRecordTypesList()
    const collectionResponseTypes = createCollectionResponseTypes()
    const collectionResponseTypesList = createCollectionResponseTypesList()
    const pocketbaseType = createPocketbaseType()

    collections.forEach((collection) => {
        types.add(collection)
        collectionRecordTypesList.add(collection)
        collectionResponseTypes.add(collection)
        collectionResponseTypesList.add(collection)
        pocketbaseType.add(collection)
    })

    typesFileContent.push(types.get())
    typesFileContent.push(collectionRecordTypesList.get())
    typesFileContent.push(collectionResponseTypes.get())
    typesFileContent.push(collectionResponseTypesList.get())
    typesFileContent.push(pocketbaseType.get())

    return typesFileContent.join("\n\n") + "\n"
}