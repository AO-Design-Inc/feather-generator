
FROM gitpod/workspace-full

RUN sudo apt install openssh-sftp-server -y && \
    sudo ln -s /usr/lib/sftp-server /usr/libexec/sftp-server && \
    sudo apt install tmux -y