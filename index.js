const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const bodyParser = require('body-parser');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');
const port = process.env.PORT || 5000;


// middleware
// const corsOptions = {
//     origin: ['http://localhost:5173', 'http://localhost:5174'],
//     credentials: true,
// }
app.use(cors())

app.use(express.json())
// app.use(cookieParser())

// Verify Token Middleware
const verifiedToken = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' });
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'forbidden access' });
        }
        req.decoded = decoded;
        next();
    });
};



// verify admin
const verifyAdmin = async (req, res, next) => {
    console.log('shahin')
    const user = req.user
    const query = { email: user?.email }
    const result = await usersCollection.findOne(query)
    console.log(result?.role)
    if (!result || result?.role !== 'admin')
        return res.status(401).send({ message: 'unauthorized access!!' })

    next()
}
// verify trainer
const verifyTrainer = async (req, res, next) => {
    console.log('akhi trainer')
    const user = req.user
    const query = { email: user?.email }
    const result = await usersCollection.findOne(query)
    console.log(result?.role)
    if (!result || result?.role !== 'trainer') {
        return res.status(401).send({ message: 'unauthorized access!!' })
    }

    next()
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
        const slotCollection = client.db('ironFitness').collection('slot');
        const forumCollection = client.db('ironFitness').collection('forum')
        const reviewCollection = client.db('ironFitness').collection('review')
        const usersCollection = client.db('ironFitness').collection('users')
        const paymentCollection = client.db('ironFitness').collection('payment')
        const feedBackCollection = client.db('ironFitness').collection('feedback')

        const subscribeCollection = client.db('ironFitness').collection('subscribers')
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
        // Send a ping to confirm a successful connection
        app.get('/slot-slot', async (req, res) => {
            const result = await slotsCollection.find({
                status: 'pending'
            }).toArray();
            res.send(result);
        })
        // GET request to fetch applications based on user email
        app.get('/api/slots/:email', async (req, res) => {
            const email = req.params.email;
            const slotsCollection = client.db('ironFitness').collection('slots');

            try {
                const applications = await slotsCollection.find({ email }).toArray();
                res.status(200).json(applications);
            } catch (error) {
                console.error('Error fetching applications:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // POST request to update application status
        app.post('/api/slots/update-status/:id', async (req, res) => {
            const id = req.params.id;
            const { status, rejectionMessage } = req.body;
            const slotsCollection = client.db('ironFitness').collection('slots');

            try {
                const filter = { _id: ObjectId(id) };
                const updateDoc = {
                    $set: {
                        status,
                        rejectionMessage,
                    },
                };
                const result = await slotsCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 1) {
                    res.status(200).json({ message: 'Application status updated successfully' });
                } else {
                    res.status(404).json({ error: 'Application not found' });
                }
            } catch (error) {
                console.error('Error updating application status:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });



        // slots data  from data base
        app.get('/slots', async (req, res) => {
            try {
                const result = await slotsCollection.find({ status: 'approved' }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch slots data", error });
            }
        });


        // save become trainer slots data to db
        app.post('/slots', async (req, res) => {
            const slot = req.body;
            const result = await slotsCollection.insertOne(slot)
            res.send(result);
        })
        // feedback api
        app.post('/feedback', async (req, res) => {
            const slot = req.body;
            const result = await feedBackCollection.insertOne(slot)
            res.send(result);
        })
        app.get("/feedback/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const query = { email: email };
                const result = await feedBackCollection.findOne(query);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "failed to data find by email", error });
            }
        });



        // post data from slot collections
        app.post('/slot', async (req, res) => {
            const slot = req.body;
            const result = await slotCollection.insertOne(slot)
            res.send(result);
        });

        // get dat form slot collections
        app.get('/slot', async (req, res) => {
            const result = await slotCollection.find().toArray()
            res.send(result)
        });




        //for details page
        app.get('/slot/:id', async (req, res) => {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ error: 'Invalid slot ID format' });
            }
            try {
                const query = { _id: new ObjectId(id) };
                const result = await slotsCollection.findOne(query);
                if (!result) {
                    return res.status(404).send({ error: 'Slot not found' });
                }
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Failed to fetch slot data', error });
            }
        });



        //Trainer slots 
        app.post('/trainers', async (req, res) => {
            const slot = req.body;
            const result = await trainerCollection.insertOne(slot)
            res.send(result);
        })
        // Get slot data by email
        app.get("/slot-email/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const query = { email: email };
                const result = await slotsCollection.findOne(query);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch trainer slots data", error });
            }
        });
        // slot add by mail
        app.get("/slot-add/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const query = { email: email }
                const result = await slotCollection.findOne(query);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch trainer slots data", error });
            }
        });


        app.post("/slot/make-trainer/:email", async (req, res) => {
            try {
                if (req.body.make_trainer) {
                    const email = req.params.email;
                    const query = { email: email }
                    const result = await slotsCollection.updateOne(query, {
                        $set: { status: "approved" },
                    });
                    // user role to trainer
                    const trainerQuery = { email: email }
                    const trainerResult = await usersCollection.updateOne(trainerQuery, {
                        $set: { role: "trainer" },
                    });

                    res.send(result);
                } else {

                }



            } catch (error) {
                res.status(500).send({ message: "Failed to fetch trainer slots data", error });
            }
        });
        //slot data delete 
        app.delete('/slot/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await slotsCollection.deleteOne(query)
            res.send(result)
        })
        // Route to delete a slot by email
        app.delete('/slot/:email', async (req, res) => {
            try {
                const { email } = req.params;
                const result = await slotsCollection.deleteMany({ "info.email": email });
                if (result.deletedCount > 0) {
                    res.status(200).json({ status: 'success' });
                } else {
                    res.status(404).json({ status: 'failure', message: 'Email not found' });
                }
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        //slots data get activity page from DB
        app.get('/slots/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await slotsCollection.findOne(query)
            res.send(result)
        })

        app.post('/users/trainer/demote/:email', async (req, res) => {
            const trainer = await trainerCollection.findOne({
                email: req.params.email
            });
            if (!trainer) {
                return res.status(404).send({ error: 'Trainer not found' });
            }
            const result = await usersCollection.updateOne({
                email: req.params.email
            }, {
                $set: { role: 'member' },
            })
            res.json({
                success: true,
                message: 'demoted successfully'
            }).status(200)
        });



        app.put('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email };

            try {
                // Check if user already exists in the database
                const existingUser = await usersCollection.findOne(query);

                if (existingUser) {
                    if (user.status === 'Requested') {
                        // Update the user status if they request a status change
                        const result = await usersCollection.updateOne(query, {
                            $set: { status: user?.status },
                        });
                        return res.send(result);
                    } else if (user.name) {
                        // Update only non-role fields if the user logs in again and has a valid name
                        const updateDoc = {
                            $set: {
                                name: user.name,
                                status: user.status,
                                Timestamp: Date.now(),
                            },
                        };
                        const result = await usersCollection.updateOne(query, updateDoc);
                        return res.send(result);
                    } else {
                        // If existing user logs in again and doesn't require an update, return their data
                        return res.send(existingUser);
                    }
                } else {
                    // If user doesn't exist in the database, insert them as a new entry
                    if (user.name) {
                        const newUser = {
                            ...user,
                            Timestamp: Date.now(),
                        };
                        const result = await usersCollection.insertOne(newUser);
                        return res.send(result);
                    } else {
                        return res.status(400).send({ message: "Name cannot be null" });
                    }
                }
            } catch (error) {
                console.error("Error updating user:", error);
                res.status(500).send({ message: "Internal server error", error });
            }
        });



        // get all user email from db.
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email });
            res.send(result);
        });

        // get all users data from db
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        });


        app.get('/users/trainer', async (req, res) => {
            const result = await usersCollection.find({
                role: 'trainer'
            }).toArray()
            res.send(result)
        })




        //review related Api
        app.get('/review', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })
        // review data post here to DB
        app.post('/review', async (req, res) => {
            try {
                const { email, trainerId, review, rating, date, photoURL, displayName } = req.body;
                const newReview = { email, trainerId, review, rating, date, photoURL, displayName };
                const result = await reviewCollection.insertOne(newReview);
                res.status(201).json(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to submit review' });
            }
        });
        // Save subscribe data in DB
        app.post("/subscribe", async (req, res) => {
            const subscriptionData = req.body;
            try {
                const result = await subscribeCollection.insertOne(subscriptionData);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to save subscription data", error });
            }
        });

        // get all all subscribers data from DB
        app.get("/subscribers", async (req, res) => {
            try {
                const result = await subscribeCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch subscribers data", error });
            }
        });

        // collect all class from database
        app.get('/class', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result)
        })
        // collect all class from database
        app.get('/class-home', async (req, res) => {
            try {
                const { page = 1, limit = 6 } = req.query;

                // Convert page and limit to integers
                const pageInt = parseInt(page);
                const limitInt = parseInt(limit);

                // Calculate the number of documents to skip
                const skip = (pageInt - 1) * limitInt;

                // Fetch the paginated results from the collection
                const result = await classCollection.find().skip(skip).limit(limitInt).toArray();

                // Get the total number of documents in the collection
                const totalDocuments = await classCollection.countDocuments();

                // Calculate the total number of pages
                const totalPages = Math.ceil(totalDocuments / limitInt);

                // Send the paginated results and metadata
                res.send({
                    totalDocuments,
                    totalPages,
                    currentPage: pageInt,
                    limit: limitInt,
                    data: result,
                });
            } catch (error) {
                console.error("Error fetching paginated classes:", error);
                res.status(500).send({ error: "An error occurred while fetching classes" });
            }
        });
        // add new forum data:
        app.post("/forum", async (req, res) => {
            const ForumData = req.body;

            try {
                // Fetch user's role from the database
                const user = await getUserByEmail(ForumData.email);

                // Default to 'user' if the role is not found
                const userRole = user ? user.role : "user";

                // Ensure only 'admin' or 'trainer' roles can post to the forum
                if (userRole === "admin" || userRole === "trainer") {
                    const postWithRole = { ...ForumData, role: userRole };

                    const result = await forumCollection.insertOne(postWithRole);
                    res.send(result);
                } else {
                    res.status(403).send("Only admins and trainers are allowed to post in the forum.");
                }
            } catch (error) {
                console.error('Error posting to forum:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        async function getUserByEmail(email) {
            try {
                // Fetch user from the usersCollection
                const user = await usersCollection.findOne({ email });
                return user;
            } catch (error) {
                console.error('Error fetching user by email:', error);
                return null;
            }
        }


        // Get forum data form db
        app.get("/forum", async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = 6;
            const skip = (page - 1) * limit;
            const total = await forumCollection.countDocuments();
            const forums = await forumCollection
                .find()
                .skip(skip)
                .limit(limit)
                .toArray();
            res.send({ forums, total, page, pages: Math.ceil(total / limit) });
        });



        // save add class data from database 
        app.post("/class", async (req, res) => {
            const ClassData = req.body;
            const result = await classCollection.insertOne(ClassData);
            res.send(result);
        });

        app.post("/pay-now", async (req, res) => {
            const { trainer_info, trainer_id, slot_name, package_name, price, user_id, email, displayName, photoURL } = req.body;

            // Validate data (add more validation as needed)
            if (!trainer_info || !trainer_id || !slot_name || !package_name || !price || !email || !displayName || !photoURL) {
                return res.status(422).json({ error: 'Missing required fields' });
            }

            // Create a new payment document
            const newPayment = {
                trainer_info,
                trainer_id,
                slot_name,
                package_name,
                price,
                user_id,
                email,
                displayName,
                photoURL,
                created_at: new Date(),
            };

            // Insert the payment document into the collection
            const result = await paymentCollection.insertOne(newPayment);

            res.json({
                'message': "Payment successful",
                'data': result,
                'result': true
            }).status(200);
        });
        app.get("/payment-list", async (req, res) => {

            // Insert the payment document into the collection
            const result = await paymentCollection.find().sort({
                crated_at: 1
            }).toArray();

            res.json({
                'data': result,
                'result': true
            }).status(200);
        });
        // get data from payment collection
        app.get('/payment/:email', async (req, res) => {
            const email = req.params.email;
            const result = await paymentCollection.find({ email }).toArray();
            res.send(result);
        });

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
            let classList = [];
            if (result.classes && Array.isArray(result.classes)) {
                classList = await Promise.all(
                    result.classes.map(async (slot) => {
                        return await classCollection.findOne({ _id: new ObjectId(slot) });
                    })
                );
            }

            result.classLists = classList;
            res.send(result);
        });




        // Forum-related APIs
        // Add a new forum post
        app.post('/forum', verifiedToken, async (req, res) => {
            try {
                const user = req.decoded;
                const { title, content } = req.body;
                const newPost = {
                    title,
                    content,
                    author: { email: user?.email, name: user?.name, role: user?.role },
                    votes: { upvotes: 0, downvotes: 0 },
                    createdAt: new Date()
                };
                const result = await forumCollection.insertOne(newPost);
                res.status(201).send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to add forum post", error });
            }
        });

        // Get forum posts with pagination
        app.get("/forum", async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = 6;
            const skip = (page - 1) * limit;
            const total = await forumCollection.countDocuments();
            const forums = await forumCollection.find().skip(skip).limit(limit).toArray();
            res.send({ forums, total, page, pages: Math.ceil(total / limit) });
        });

        // Upvote or downvote a forum post
        app.post('/forum/vote', verifiedToken, async (req, res) => {
            try {
                const { postId, voteType } = req.body; // voteType can be 'upvote' or 'downvote'
                const update = voteType === 'upvote' ? { $inc: { 'votes.upvotes': 1 } } : { $inc: { 'votes.downvotes': 1 } };
                const result = await forumCollection.updateOne({ _id: new ObjectId(postId) }, update);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to vote on forum post", error });
            }
        });



        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");


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