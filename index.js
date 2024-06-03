const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 4009;


// middleware
app.use(cors());
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6ypdnj9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        //database collections
        const classCollection = client.db('ironFitness').collection('class')
        const trainerCollection = client.db('ironFitness').collection('trainer')
        const forumCollection = client.db('ironFitness').collection('forum')
        const reviewCollection = client.db('ironFitness').collection('review')
        // jwt token:
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '7d'
            })
            res.send({ token });
        })
        // Forum API 
        app.get('/forum', async (req, res) => {
            const result = await forumCollection.find().toArray();
            res.send(result);
        })
        //review related Api
        app.get('/review', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        // collect all class from database
        app.get('/class', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result)
        })
        // collect all trainer data from database
        app.get('/trainer', async (req, res) => {
            const result = await trainerCollection.find().toArray();
            res.send(result)
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('make your fitness like IRON MAN')
})

app.listen(port, () => {
    console.log(`IRON fitness running port ${port}`)
})