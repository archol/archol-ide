import { server } from './http'
import { init } from './init'

require('../shared/shared.js')

init(() => {
    server.listen(process.env.PORT || 3000, function listening() {
        console.log('Listening on %d', server.address().port);
    })
})