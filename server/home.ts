

export interface HtmlTag {
    [name: string]: string | HtmlTag | HtmlTag[]
}

export type SendTags = (tags: HtmlTag) => void

export let styles: string[] = []
export let scripts: string[] = []

export function home(send: SendTags) {
    send({
        html: {
            head: {
                title: { textContent: 'Archol' },
                scripts: getScripts()
            },
            body: {

            }
        }
    })
}

function getScripts(): HtmlTag[] {
    let r: HtmlTag[] = []
    return r.concat(scripts.map((s) => ({
        script: {
            src: s
        }
    }))).concat([
        {
            script: {
                textContent: `
SystemJS.config({
  packages: {
    ".": {
        defaultExtension: 'js'
    }
  }
});
SystemJS.import("/js/app/app");`
            }
        }
    ]);
}