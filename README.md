# DOMW (DevOps Mid-West) Sample App

First of all, thanks for attending our talk!  During this hands-on workshop, we will be using this code to teach you the following objectives:

  * Take an existing application and containerize it
  * Realize the portability of containers
  * Host your containerized application in a serverless environment
  * Scale your deployment to handle production-level volumes

# Prerequisites

  * [Node JS](https://nodejs.org/en/)
  * An [AWS Account](https://portal.aws.amazon.com/billing/signup?nc2=h_ct&src=header_signup&redirect_url=https%3A%2F%2Faws.amazon.com%2Fregistration-confirmation#/start/email)
  * [Docker](https://www.docker.com/products/docker-desktop/)
  * An [internet](https://www.google.com/search?q=what+is+the+internet&oq=what+is+the+internet) connection


# Containerizing Your Application

Containers are similar to little virtual machines capable of running your applications. In this workshop, we will take an existing application and show how you prepare it to run inside of a container.

## domw-app

The `domw-app` directory of this application is where you will find a trivial -- yet usable -- application that we will use to represent an existing application in your organization.  We will customize it just a smidge to make it a little less trivial and, hopefully, draw a clearer connection between what we're doing and how it applies to a system or systems within your organization.

### Running domw-app

_Be sure you've taken care of all of the [prerequisites](#prerequisites)._
Open a terminal window, and change to the directory where this application code resides.  From there, type:

```bash
npm install
npm run seed
npm start
```

If all went well, you should get a message indicating `Example app listening on port 3000`.  Open your browser and go to [http://localhost:3000/](http://localhost:3000/).  Additionally, you can see a rudimentary health check at [http://localhost:3000/status](http://localhost:3000/status), a simple time API at [http://localhost:3000/time](http://localhost:3000/time), and a more custom API at [http://localhost:3000/api](http://localhost:3000/api).

### Modifying domw-app

The `api` endpoint of this application outputs several pieces of information related to the system it's running on:

  * The runtime version of Node
  * Directory listing of files located in `./appdata`
  * Contents of all files with a `.txt` extension in the `./appdata` directory

Now's the time to make whatever changes you'd like in the `./appdata` directory; delete some files, add some new ones, do whatever you want in that appdata directory.  After you've altered a few things, stop the application by pressing `CTRL + C` in the terminal window, and then start it back up again by typing `npm start`.

## Docker

There are several containerization engines out there today, but if you google "software containers" all the results on the first page (and the next, and the next) all pertain to Docker.  Docker makes it easy and fun to create and play with containers.

### Building An Initial Container Image

There is already a `Dockerfile` as part of this application inside the `./domw-app` directory.  The `Dockerfile` can be considered Infrastructure-as-Code ("IaC") as it is a "code" file, is committed to source control, and most importantly, it [defines the makeup](https://docs.docker.com/engine/reference/builder/) of your application's infrastructure / container / server.

To use the `Dockerfile` to convert `domw-app` into a container image, run the following from the `./domw-app` directory in your terminal window:

```bash
docker build -t domw:1.0 .
```

After a short while (and a whole bunch of text printing across your screen), you should have a new Docker image built on your machine.  You can verify this by running `docker images`, the output of which should include your `domw` image with a `TAG` of `1.0`.

That's it!  You containerized your app!

### Running Your Application In A Container

But, how do you go about _using_ your containerized app now?  The thing we built in the last section is an __image__ of a container.  Think of it as a snapshot or backup of a server that runs your app.  With that backup, we can now "restore" it onto the hard drive of another server.  The running instance of that backup's restore is a __running container__.  Let's do the Docker version of restoring that backup (or, rather, "let's launch a container from the image").

To launch a container, we'll use the [docker run](https://docs.docker.com/engine/reference/commandline/run/) command.  In your terminal window, run the command below.  _Be sure to stop your locally running domw-app first by pressing `CTRL + C` if it's running anywhere else._

```bash
docker run --rm -p 3000:3000 domw:1.0
```

Your application is now running as a container, and you can access it just as you did the locally running application at [http://localhost:3000/](http://localhost:3000/).

One of the neat features of backups is that you can restore them any number of times.  Coincidentally, you can do the same with Docker images!  In another terminal window, run this command:

```bash
docker run --rm -p 3001:3000 domw:1.0
```

Just that easily, you now have two instances of your application running!  Don't believe it?  Let's now focus on altering the `Dockerfile` to make some noticable differences from one running container to the next.

_FYI, press `CTRL + C` in the terminal windows to stop the running containers whenever you're done with them_

### Customizing Your Application's Image


# Serverless Container Deployment

## AWS ECS

## CDK

```terminal
npm install -g cdk
cdk bootstrap
```
