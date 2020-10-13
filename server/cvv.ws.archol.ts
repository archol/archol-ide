import { ArcholWorkspace } from './archolTypes';

export let wsData: ArcholWorkspace = {
  "node": {
    "kind": "workspace"
  },
  "apps": [
    {
      "node": {
        "kind": "application"
      },
      "name": "appcvv",
      "uri": "appcvv.org.br",
      "generate": {
        "path": "/home/thr0w/projects/appcvv",
        "number": 1
      },
      "uses": [],
      "menu": [
        {
          "node": {
            'kind': 'i18n'
          },
          "title": {
            "node": {
              'kind': 'i18n'
            },
            "msg": {
              'pt_BR': 'Mural'
            }
          },
          "icon": {
            "node": {
              'kind': 'icon'
             },
             "path": "home"
          },
          "routePath": {
            "node": {
              'kind': 'routePath'
            },
            "path": ""
          }
        }
      ]
    },
    {
      "node": {
        "kind": "application"
      },
      "name": "archol",
      "uri": "archol.hoda5.com",
      "generate": {
        "path": "/home/thr0w/projects/archol",
        "number": 1
      },
      "uses": []
    }
  ],
  "pkgs": []
}