const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;
const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// jwt verification
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).send({ message: 'Unauthorized Access' })
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).send({ message: 'Forbidden Access' })
    }
    req.decoded = decoded;
    next();
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.skcpj7w.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
  try {
    await client.connect();

    // collections
    const courseCollection = client.db("pathagar_db").collection("courses");
    const bookCollection = client.db("pathagar_db").collection("books");
    const orderCollection = client.db("pathagar_db").collection("orders");
    const userCollection = client.db("pathagar_db").collection("users");
    const paymentCollection = client.db("pathagar_db").collection("payments");

    // admin varification
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'Forbidden Access' })
      }
    }

    // course route
    app.get('/course', async (req, res) => {
      const courses = await courseCollection.find().toArray();
      res.send(courses)

    })

    app.get('/course/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const courses = await courseCollection.findOne(query);
      res.send(courses)
    })

    // book route
    app.get('/book', async (req, res) => {
      const books = await bookCollection.find().toArray();
      res.send(books)

    })

    app.get('/book/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const books = await bookCollection.findOne(query);
      res.send(books)
    })

    // order route
    app.get('/order', verifyJWT, async (req, res) => {
      const orders = await orderCollection.find().toArray();
      res.send(orders);
    })

    app.get('/order/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const orders = await orderCollection.findOne(query);
      res.send(orders)
    })

    app.get('/order', verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const orders = await orderCollection.find(query).toArray();
        res.send(orders)
      }
      else {
        res.status(403).send({ message: 'Forbidden Access' })
      }
    })

    app.patch('/order/:id', async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await orderCollection.updateOne(filter, updateDoc);
      res.send(updateDoc);
    })

    app.post('/order', async (req, res) => {
      const order = req.body;
      const orders = await orderCollection.insertOne(order);
      res.send(orders)
    })

    app.delete('/order/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const orders = await orderCollection.deleteOne(query);
      res.send(orders)
    })

    app.put('/order/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const shippingUpdate = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: shippingUpdate.status
        }
      };
      const orders = await orderCollection.updateOne(filter, updateDoc, options);
      res.send(orders)
    })

    // user route
    app.get('/user', async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users)

    })

    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const users = await userCollection.updateOne(filter, updateDoc);
      res.send(users)
    })

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const users = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30d' });
      res.send({ users, token })
    })

    // admin checking route
    app.get('/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin })
    })

    // payment route
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret })
    })

  }

  finally {
    // await client.close();
  }

}

run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello from pathagar server')
});

app.listen(port, () => {
  console.log('Successfully listening from', port)
});