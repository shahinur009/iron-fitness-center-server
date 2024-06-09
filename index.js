const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');
const port = process.env.PORT || 4009;


// middleware
// const corsOptions = {
//     origin: ['http://localhost:5173', 'http://localhost:5174'],
//     credentials: true,
// }
app.use(cors())

app.use(express.json())
// app.use(cookieParser())

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token
    console.log(token)
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err)
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded
        next()
    })
}



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
        const trainerCollection = client.db('ironFitness').collection('trainers')
        const slotsCollection = client.db('ironFitness').collection('slots')
        const forumCollection = client.db('ironFitness').collection('forum')
        const reviewCollection = client.db('ironFitness').collection('review')
        const usersCollection = client.db('ironFitness').collection('users')
        // jwt token:
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' });
            res.send({ token })
        })
        // Logout
        app.get('/logout', async (req, res) => {
            try {
                res
                    .clearCookie('token', {
                        maxAge: 0,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                    })
                    .send({ success: true })
                console.log('Logout successful')
            } catch (err) {
                res.status(500).send(err)
            }
        })
        // save slots data to db
        app.post('/slots', async (req, res) => {
            const slot = req.body;
            const result = await slotsCollection.insertOne(slot)
            res.send(result);
        })

        //save user data in database
        app.put('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email }
            // check if user already in database
            const isExist = await usersCollection.findOne(query);
            if (isExist) {
                if (user.status === 'Requested') {
                    // if existing user try to change his role
                    const result = await usersCollection.updateOne(query, {
                        $set: { status: user?.status },
                    })
                    return res.send(result)
                } else {
                    // if existing user login again
                    return res.send(isExist)
                }
            }
            // save user for the first time
            const options = { upsert: true }
            const updateDoc = {
                ...user,
                Timestamp: Date.now()

            }
            const result = await usersCollection.insertOne(updateDoc, options)
            res.send(result)
        })
        // get all user email from db.
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email });
            res.send(result);
        })
        // get all users data from db
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
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
        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result)
        })
        // collect single class data from database
        app.get('/class/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classCollection.findOne(query);
            res.send(result)
        })
        // 
        app.get('/trainers/class/:id', async (req, res) => {
            id = req.params.id;
            const query = { classes: id }
            const result = await trainerCollection.find(query).toArray();
            res.send(result)
        })
        // collect all trainer data from database
        app.get('/trainers', async (req, res) => {
            const result = await trainerCollection.find().toArray();
            res.send(result)
        })
        // collect trainer details  data from database
        app.get('/trainer/:id', async (req, res) => {
            id = req.params.id;
            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ error: 'Invalid trainer ID format' });
            }
            const query = { _id: new ObjectId(id) }
            const result = await trainerCollection.findOne(query);
            if (!result) {
                return res.status(404).send({ error: 'Trainer not found' });
            }
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