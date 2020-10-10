import express from 'express'
import './wsDoc'

const app = express();

// app.use(Gun.serve).use(express.static(__dirname));

app.use(express.static("public"));

app.get("/", (request, response) => {
    console.log(__dirname + "/public/index.html")
    response.sendFile(__dirname + "/public/index.html");
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on localhost:" + (listener.address() as any).port);
});

interface RPCdb {
    jobs: {
        [key: string]: Job
    }
}

interface Job {
    func: string
    input: string
    output: string
    requestDate: number
    requestUser: string
    execDate?: number
    execUser?: string
}
