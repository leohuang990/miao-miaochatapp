const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors')
const bcript = require('bcrypt');


// file upload stuff
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const User = require('./models/User');
const uri = require('./config/key').mongoURI

const app = express();
app.use(cors()) // Use this after the variable declaration
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
  }));
const server = http.createServer(app);
// Init gfs
let gfs;
mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false 
     
  }) // Adding new mongo url parser
  .then(() => {
      gfs = Grid(mongoose.connection.db, mongoose.mongo);
      gfs.collection('uploads');
      console.log('MongoDB Connected...')})

const storage = new GridFsStorage({
    url: uri,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            const fileInfo = {
                filename: file.originalname,
                bucketName: 'uploads'
            }
            resolve(fileInfo)
        });
    }
});
const upload = multer({ storage });

app.post('/card', upload.single('img'), (req, res) => {
    res.json({ file: req.file });
});

app.get('/', (req, res)=>{
    res.json('server is running')
})

app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
      
      // Check if image
      if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
        // Read output to browser
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else {
        res.status(404).json({
          err: 'Not an image'
        });
      }
    });
  });

  app.delete('/images/:filename', (req, res) => {
    gfs.remove({ filename: req.params.filename, root: 'uploads' }, (err, gridStore) => {
      if (err) {
        return res.status(404).json({ err: err });
      }
      res.json('OK')
    });
  });

app.use('/api/users', require('./routesAPI/users'));
app.use('/api/auth', require('./routesAPI/auth'));

const port = process.env.PORT||5000;

server.listen(port, () => console.log(`Server started on port ${port}`));


let hashMap = new Map();
const io = socketio(server,{
    cors: {
      origin: "https://miaomiao-chatv2.herokuapp.com",
      credentials: true
    }});
io.on('connection', socket=>{
    const id = socket.id;
    let username = '';
    socket.on('join', (name)=>{
        hashMap.set(name, id);
        username = name;
        
    });
    socket.on('sendRequest', (opponent)=>{
        User.findOneAndUpdate({name: opponent}, 
            {$push:{requestReceived: username}}
        ).then((err)=>'')
        User.findOneAndUpdate({name: username}, 
            {$push:{requestSent: opponent}}
        ).then((err)=>'')
        if(hashMap.has(opponent)){
            io.to(hashMap.get(opponent)).emit('receiveRequest', username);
        } 
        
    })
    socket.on('requestAnswered', (from, to, isFriend)=>{
        
        User.findOneAndUpdate({name: to}, 
            {$pullAll:{requestSent: [from]}}
        ).then((err)=>'')
        User.findOneAndUpdate({name: from}, 
            {$pullAll:{requestReceived: [to]}}
        ).then((err)=>'')
        if(isFriend){
            User.findOneAndUpdate({name: to}, 
                {$push:{friends: [[from]]}}
            ).then((err)=>'')
            User.findOneAndUpdate({name: from}, 
                {$push:{friends: [[to]]}}
            ).then((err)=>'')
        }
        if(hashMap.has(to)){
            io.to(hashMap.get(to)).emit('receiveResponse', from, isFriend);
        } 
    })
    socket.on('sendChat', (from, to, msg)=>{
        User.find({name: from}).then(user=>{
            user[0].friends.filter(hist=>hist[0]===to)[0].push({me: true, msg});
            User.findOneAndUpdate({name: from}, {$set:{
                friends: user[0].friends
            }}).then(()=>'done')
        }).then(()=>{})
        User.find({name: to}).then(user=>{
            user[0].friends.filter(hist=>hist[0]===from)[0].push({me: false, msg});
            User.findOneAndUpdate({name: to}, {$set:{
                friends: user[0].friends
            }}).then(()=>'done')
        }).then(()=>{})
        if(hashMap.has(to)){
            io.to(hashMap.get(to)).emit('receiveChat', from, msg);
        }
    })
    socket.on('changeBackground', (name, str)=>{
        
        User.findOneAndUpdate({name}, {$set:{
            background: str
        }}).then(()=>'done')
    })
    socket.on('changeLanguage', (name, str)=>{
        
        User.findOneAndUpdate({name}, {$set:{
            language: str
        }}).then(()=>'done')
    })
    socket.on('changePs', (name, pa, pb, pc, cb)=>{
        if(!pa||!pb||!pc) return cb('Please fill out all fields')
        User.findOne({name})
        .then(user=>{
            bcript.compare(pa, user.password)
            .then(isMatch=>{
                if(!isMatch) return cb('Wrong password')
                if(pb!==pc){
                    return cb('Passwords mismatch')
                }
                if(pb.length<8){
                    return cb('Your password should contain at least 8 characters')
                }
                let temp
                bcript.genSalt(10, (err, salt)=>{
                    bcript.hash(pa, salt, (err, hash)=>{
                        temp = hash
                    })
                })
                User.findOneAndUpdate({name}, {$set:{password: temp}}).then(()=>'done')
                cb();
            })
        });
        
    })
    socket.on('card', (email, description, image)=>{
        User.findOneAndUpdate({email}, {$set:{
            description
        }}).then(()=>'done')
        if(image){
            User.findOneAndUpdate({email}, {$set:{
                icon: image
            }}).then(()=>'done')
        }
    })
    socket.on('unfriend', (from, to)=>{
        
        User.find({name: from}).then(user=>{
            const temp = user[0].friends.filter(hist=>hist[0]!==to);
            User.findOneAndUpdate({name: from}, {$set:{
                friends: temp
            }}).then(()=>'done')
        }).then(()=>{})
        User.find({name: to}).then(user=>{
            const temp = user[0].friends.filter(hist=>hist[0]!==from);
            User.findOneAndUpdate({name: to}, {$set:{
                friends: temp
            }}).then(()=>'done')
        }).then(()=>{})
        if(hashMap.has(to)){
            io.to(hashMap.get(to)).emit('receiveUnfriend', from);
        }
    })
    socket.on('disconnect', ()=>{
        hashMap.delete(username);
    })

})
