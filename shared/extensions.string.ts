

declare interface String {
    // toNumber(): number
    // toMoney(): number
    // toDate(): Date
    // toDuration(): Duration
    // toCPF(): number
    // toCNPJ(): number
    // toTelefones(): string[]
    padLeft(size: number, char: string): string
    padRight(size: number, char: string): string
}


String.prototype.padLeft = function padLeft(this: string, length: number, char: string) {
    let r = this
    while (r.length < length) r = char + r
    return r
}

String.prototype.padRight = function padRight(this: string, length: number, char: string) {
    let r = this
    while (r.length < length) r = r + char
    return r
}

// String.prototype.toGUID = function toGUID(this: string): GUID {
//   return hType.GUID.parse(this.toString())
// }

// String.prototype.toNumber = function toNumber(this: string): number {
//   return hType.Number.parse(this.toString())
// }
// String.prototype.toMoney = function toMoney(this: string): number {
//   return hType.Money.parse(this.toString())
// }
// String.prototype.toDate = function toDate(this: string): Date {
//   return hType.Date.parse(this.toString())
// }
// String.prototype.toDuration = function toDuration(this: string): Duration {
//   return hType.Duration.parse(this.toString())
// }
// String.prototype.toCPF = function toCPF(this: string): number {
//   return hType.CPF.parse(this.toString())
// }

// String.prototype.toCNPJ = function toCNPJ(this: string): number {
//   return hType.CNPJ.parse(this.toString())
// }

// String.prototype.toTelefones = function toTelefones(this: string): string[] {
//   return hType.Telefones.parse(this.toString())
// }
