FROM sitespeedio/webbrowsers:firefox-54.0-chrome-62.0-chrome-beta-3

ENV SITESPEED_IO_BROWSERTIME__XVFB true
ENV SITESPEED_IO_BROWSERTIME__DOCKER true
ENV SITESPEED_IO_BROWSERTIME__VIDEO true
ENV SITESPEED_IO_BROWSERTIME__speedIndex true

WORKDIR /work
RUN sudo apt-get update && sudo apt-get install libnss3-tools \
  curl \
  git \
  iproute2 \
  iptables -y && \
  mkdir -p $HOME/.pki/nssdb && \
  certutil -d $HOME/.pki/nssdb -N && \
  curl -O https://storage.googleapis.com/golang/go1.9.linux-amd64.tar.gz && \
  tar -xvf go1.9.linux-amd64.tar.gz && \
  sudo mv go /usr/local

ENV PATH="/usr/local/go/bin:${PATH}"

RUN go get github.com/urfave/cli && \
  go get golang.org/x/net/http2 && \
  go get github.com/catapult-project/catapult/web_page_replay_go/src/webpagereplay

WORKDIR /root/go/src/github.com/catapult-project/catapult/web_page_replay_go
RUN go run src/wpr.go installroot

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install --production
COPY . /usr/src/app

COPY docker/scripts/start.sh /start.sh

## This is to avoid click the OK button
RUN mkdir -m 0750 /root/.android
ADD docker/adb/insecure_shared_adbkey /root/.android/adbkey
ADD docker/adb/insecure_shared_adbkey.pub /root/.android/adbkey.pub



ENTRYPOINT ["/start.sh"]
VOLUME /sitespeed.io
WORKDIR /sitespeed.io
