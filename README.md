# Forwarding UNIX domain sockets to Docker for Mac containers

## Motivation
I wanted to do this to see if I could use spring binstubs on my (Mac) laptop, running rspec commands in a Docker container. The setup is described by [Jon Leighton][https://github.com/jonleighton/spring-docker-example] but he uses Linux on his laptop. The Mac OS setup requires a bit more work.

## Method
1. Write a simple TCP socket server in node.
2. Check a client can connect with both server and client on my laptop.
3. Get it working with a UNIX domain socket instead of TCP.
4. Get it working in a Docker for Mac container.
5. Prove that it's possible to share the Unix domain socket using Docker compose with a shared volume
6. Test client and server in separate Docker for Mac containers
8. Use ssh socket tunnelling to bridge laptop and Docker container

## Results
To test TCP sockets I used telnet. To test UNIX domain sockets I used
```
socat - UNIX-CONNECT:tmp/simple.sock
```

I learnt that when using UNIX sockets the socket file is removed as part of the shut down procedure only if you explicitly call ```close()``` on the server socket. Otherwise you need to remove the socket file explicitly after the server is shut down. If not, you get
```
2019/06/11 12:22:06 socat[74231] E connect(5, LEN=17 AF=1 "tmp/simple.sock", 17): Connection refused
```

If the server is not running at all (no socket file exists), you get
```
2019/06/11 12:01:09 socat[74043] E connect(5, LEN=17 AF=1 "tmp/simple.sock", 17): No such file or directory
```

The correct way to handle ```SIGINT``` (ctrl-c) is to make an explicit call to close(). In that case the socket file is removed automatically once the server socket is closed.

Note that the server will not shut down via a call to ```close()``` if any client connections are outstanding. Once the last client connection is closed, the server shuts down cleanly.

### In Docker
I needed to add a handler for SIGTERM, because this is how Docker stops a container [https://docs.docker.com/engine/reference/commandline/stop/]

```docker-compose.yml``` defines three services: a TCP server, a UNIX socket server and an SSH tunnel.

I needed to enable TCP port forwarding in the sshd config file `/etc/ssh/sshd_config. This is something of a misnomer as we are actually forwarding UNIX domain sockets, but anyway. Once I had modified this directive (see ```Dockerfile.tunnel```) I was then able to set up the tunnel on my laptop using the ssh -L command, as follows

```
ssh -nNT -p 2222 -L $(pwd)/tmp/simple.sock:/tmp/bridge/simple.sock root@localhost
```

On my laptop, I was then able to use the socat command

```
socat - UNIX-CONNECT:tmp/simple.sock
```

to connect via a local Unix socket to the simple socket server running in a Docker container.

Job done!

# Running rspec inside the editor during development

I am using Sublime Text 3. Currently, I have to alt-tab into a terminal session inside the relevant docker container, type an rspec command (or - if I'm lucky - use the up arrow) and wait for it to run. Then I alt-tab back to ST.

I *expect* to be able to write a model test, press a hot key (e.g., cmd-r), and see the result straightaway, all without leaving the editor. That's how I'd do it if the rails app were running locally on my laptop, and it's how I've done it previously, before Docker. I can tolerate a few seconds' delay, but that's about it.

The fact is, though, that this is far from trivial when the rails app runs in a docker container. Spring does a good job at reducing Rails boot times, but it uses UNIX domain sockets and is intended to run on the same machine as the rails environment.

Despite my investigation above, I have not been able to use [Jon Leighton's spring docker example][https://github.com/jonleighton/spring-docker-example] on my (Mac) laptop.

I can proxy the file-mapped spring socket OK using ```ssh -L```, but that's only half the story. The spring client also creates a pair of connected, unbound UNIX domain sockets using ```UNIXSocket.pair``` and sends the file descriptor of one of them over the proxied socket from client to server. This won't work across a network boundary without some sort of proxy which understands the intricacies of such a transfer.

What I need is a super-fast (and preferably ruby-less) binstub on my laptop which runs spring in a docker container. In effect, I need a network-aware front end to a containerised spring client.

