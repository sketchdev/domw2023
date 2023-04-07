# DOMW (DevOps Mid-West) Sample App

First of all, thanks for attending our talk!  During this hands-on workshop, we will be using this code to teach you the following objectives:

  * Take an existing application and containerize it
  * Realize the portability of containers
  * Host your containerized application in a serverless environment
  * Scale your deployment to handle production-level volumes

# Prerequisites

  * [Node JS](https://nodejs.org/en/)
  * An [AWS Account](https://portal.aws.amazon.com/billing/signup?nc2=h_ct&src=header_signup&redirect_url=https%3A%2F%2Faws.amazon.com%2Fregistration-confirmation#/start/email)
    * [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-prereqs.html)
    * CLI [Credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)
      * For this workshop, we recommend either the [Credentials file](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) or [Config file](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) methods using "Long-term credentials" (despite the warning on that page)
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

One of the neat features of backups is that you can restore them any number of times.  Coincidentally, you can do the same with Docker images!  In another terminal window in the `domw-app` directory, run this command and then browse to [http://localhost:3001/](http://localhost:3001/):

```bash
docker run --rm -p 3001:3000 domw:1.0
```

Just that easily, you now have two instances of your application running!  Don't believe it?  Let's now focus on altering the `Dockerfile` to make some noticable differences from one running container to the next.

_FYI, press `CTRL + C` in the terminal windows to stop the running containers whenever you're done with them_

### Customizing Your Application's Image

As a reminder, all IaC code for Docker lives in the `Dockerfile`.  It is here where we will need to change things to affect our application server, or "Docker container."  Opening that file up and making changes between lines 28 - 31 is a good place to copy and paste changes to fake:

 1. application configuration files (i.e., `&& touch environment.conf \`)
 1. application favicon (i.e., `&& touch fav.ico \`)
 1. .NET configuration files (i.e., `&& touch web.config \`)
 1. tomcat configuration files (i.e., `&& mkdir WEB-INF && touch WEB-INF/web.xml \`)
 1. maven credentials (i.e., `&& mkdir .m2 && touch .m2/settings-security.xml \`)
 1. custom CA certificate(s) (i.e., `&& touch custom-ca.crt \`)
 1. install nginx (i.e., `&& apk add nginx \`)
 1. install openssl (i.e., `&& apk add openssl \`)

These alterations suffice for the purposes of this demonstration, but most are rather frivolous.  In a real setting, you would make more use of the `RUN`, `COPY`, and other [Dockerfile commands](https://docs.docker.com/engine/reference/builder/) to install tools and configure your server / image.

Once you've made the desired alterations to your `Dockerfile`, it's time to build a new version of your image using the following command typed in an available terminal window:

```bash
docker build -t domw:2.0 .
```

Similar to before, a bunch of text will fly by as the new image of your application is being created.  Once that is successful, when you run `docker images`, you should see both your `domw` image with a `TAG` of `1.0` _as well as_ a `2.0` tag.  With these two tags in place, we're about to see some cool magic!

Assuming both docker containers from earlier have been stopped, it's time to launch two new containers:

```bash
docker run --rm -p 3000:3000 domw:1.0  # run this from terminal window #1
docker run --rm -p 3001:3000 domw:2.0  # run this from terminal window #2
```

Now, when you browse to [http://localhost:3000/](http://localhost:3000/), you will see the older version of your application running.  When you browse to [http://localhost:3001/](http://localhost:3001/), you will see the new version of your application containing all of the "server" modifications you made to your `Dockerfile`.

_FYI, press `CTRL + C` in the terminal windows to stop the running containers whenever you're done with them_

## TLDR;

```bash
cd domw-app
npm install
npm run seed
npm start

# browse to http://localhost:3000/api
CTRL + C

docker build -t domw:1.0 .
docker run --rm -p 3000:3000 domw:1.0

# browse to http://localhost:3000/api
CTRL + C

# modify your Dockerfile based on some suggestions from the "Customizing Your Application's Image" section

docker build -t domw:2.0 .
docker run --rm -p 3000:3000 domw:1.0
# open a new terminal window in the domw-app directory
docker run --rm -p 3001:3000 domw:2.0

# browse to http://localhost:3000/api
# browse to http://localhost:3001/api
CTRL + C  # in each of the two terminal windows
```


# Serverless Container Deployment

## AWS ECS

Amazon's [ECS](https://aws.amazon.com/ecs/) ("Elastic Container Service") offers a managed way to run your containers in the cloud.  It provides users with two different run engines.  The first is [EC2](https://aws.amazon.com/ec2/) ("Elastic Compute Cloud"), which takes available compute engines that are managed and operated by you.  The second option -- and the one we will use in this workshop -- is [Fargate](https://aws.amazon.com/fargate/), which is a "serverless" option where all compute capacity is managed and operated by AWS.  In either case, ECS does the heavy lifting of figuring out what containers fit where, scaling as demand increases or decreases, and replacing any unhealthy containers automatically.

## CDK

CDK ("Cloud Development Kit") is a framework for creating cloud infrastructure for your systems using programming languages you're already familiar with:

 * Typescript
 * Javascript
 * Java
 * Go
 * Python
 * .NET

Included within this project is an AWS infrastructure stack written in Typescript that allows the container from `domw-app` to be deployed and run in a serverless environment.

__Running and deploying this stack will incur $0.05 in charges from AWS for each hour it's running ([$30.19 per month](https://calculator.aws/#/estimate?id=5fe91ba97e9c01026de69d31f77ef482809a775f)).  Be sure to delete the resources when you're done by running `cdk destroy` to stop incurring any further charges.__

### Deploying Your Infrastructure

#### Prerequisites / First Steps
There are a couple of one-time steps that you'll need to complete before running your first deployment of this infrastructure in your AWS account.  First of which is getting the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-prereqs.html) installed and configuring proper credentials in your terminal (instructions in the previous link) for you to be able to interface with the AWS APIs.

Next, in a new terminal window, run the following:

```bash
npm install -g cdk
cdk bootstrap

cd domw-app
npm run seed

cd ../domw-iac
npm install
```

Lastly, run `docker ps` in your terminal window.  If you get any kind of error message from that, ensure you have Docker running locally.

#### Deployment Process
With all the deployment prerequisites out of the way, you can trigger deployments at any time, whether for the first time or after having made updates to your IaC code by running the command `cdk deploy` in your terminal window from the `./domw-iac` directory.

### Accessing Your Deployed Application

When you first run the `cdk deploy` command, there will be two "Outputs:" listed near the very end of everything that gets printed to your screen.  The second of which looks like `YOUR_CDK_STACK_NAME.albfargateserviceServiceURLBLAHBLAH` and has a value starting with "http://" is the one you want.  Copying that URL and pasting it into your browser will take you to your container deployed to ECS Fargate.

If you've lost that output, you can get it back by running `cdk deploy` again. (It won't deploy a duplicate set of infrastructure, so don't worry about running that command multiple times.)

### Clean Up Your Deployed Environment

When you're done, be sure to delete the deployed infrastructure so you don't incure any further costs from AWS.  You can do that by typing `cdk destroy` in your terminal window from the `./domw-iac` directory.
