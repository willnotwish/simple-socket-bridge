# Forwarding UNIX domain sockets to Docker for Mac containers

## Motivation
I wanted to do this to see if I could use spring binstubs on my (Mac) laptop, running rspec commands in a Docker container. The setup is described by Jon Leighton [https://github.com/jonleighton/spring-docker-example] but he uses Linux on his laptop. The Mac OS setup requires a bit more work.

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
```socat - UNIX-CONNECT:tmp/simple.sock```

I learnt that when using UNIX sockets the socket file is removed as part of the shut down procedure only if you explicitly call ```close()``` on the server socket. Otherwise you need to remove the socket file explicitly after the server is shut down. If not, you get
```2019/06/11 12:22:06 socat[74231] E connect(5, LEN=17 AF=1 "tmp/simple.sock", 17): Connection refused```

If the server is not running at all (no socket file exists), you get
```2019/06/11 12:01:09 socat[74043] E connect(5, LEN=17 AF=1 "tmp/simple.sock", 17): No such file or directory```

The correct way to handle ```SIGINT``` (ctrl-c) is to make an explicit call to close(). In that case the socket file is removed automatically once the server socket is closed.

Note that the server will not shut down via a call to ```close()``` if any client connections are outstanding. Once the last client connection is closed, the server shuts down cleanly.

### In Docker
I needed to add a handler for SIGTERM, because this is how Docker stops a container [https://docs.docker.com/engine/reference/commandline/stop/]

```docker-compose.yml``` defines three services: a TCP server, a UNIX socket server and an SSH tunnel.

I needed to enable TCP port forwarding in the sshd config file ```/etc/ssh/sshd_config```. This is something of a misnomer as we are actually forwarding UNIX domain sockets, but anyway. Once I had modified this directive (see ```Dockerfile.tunnel```) I was then able to set up the tunnel on my laptop using the ssh -L command, as follows

```ssh -nNT -p 2222 -L $(pwd)/tmp/simple.sock:/tmp/bridge/simple.sock root@localhost```

On my laptop, I was then able to use the socat command

```socat - UNIX-CONNECT:tmp/simple.sock```

to connect via a local Unix socket to the simple socket server running in a Docker container.

Job done!







