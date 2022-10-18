const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

// middlewares
app.use(cors());
app.use(express.json());

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
      const courseCollection = client.db("pathagar_db").collection("courses");
      const bookCollection = client.db("pathagar_db").collection("books");
      const userCollection = client.db("pathagar_db").collection("users");

      // course route
      app.get('/course', async (req, res) => {
        const courses = await courseCollection.find().toArray();
        res.send(courses)
        
    })

      // book route
      app.get('/book', async (req, res) => {
        const books = await bookCollection.find().toArray();
        res.send(books)
        
    })

    // user route
    app.get('/user', async (req, res) => {
      const users = await userCollection.find().toArray();
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