**SkyLine Robotics Aggregation**

Node.js with Mongo Database.

First clone this repo

run docker command

    docker-compose up -d --build

localhost:3000 is for node.js server
localhost:27017 is for MongoDB

Using POST request to send data into database:

URL: [localhost:3000/](localhost:3000/)

    {"timestamp": 1658582140, "1999": 1, "2828": 1, "7555": 1,"1234":1,"1424":5,"1236":1,"7894":1,"1597":1,"1435":2,"1678":1,"1746":4}

Using GET request to get analytics:

URL: [localhost:3000/statistics](localhost:3000/statistics)

In order to engage those API endpoint you will need an API platform such as Postman
