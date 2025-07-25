declare module 'wordnet' {
    export function lookup(word: string, callback: (err: any, definitions: any[]) => void): void;
    export function getHypernyms(synsetOffset: string, pos: string, callback: (err: any, hypernyms: any[]) => void): void;
}
