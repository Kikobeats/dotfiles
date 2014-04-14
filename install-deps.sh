# up to you (me) if you want to run this as a file or copy paste at your leisure
sudo chmod -R +x ~/dotfiles

# node and NPM
echo "Download and install node and npm from http://nodejs.org/download/"
read -p "Press enter when node and npm is installed..."

# https://github.com/jamiew/git-friendly
# the `push` command which copies the github compare URL to my clipboard is heaven
bash < <( curl https://raw.github.com/jamiew/git-friendly/master/install.sh)

# https://rvm.io
# rvm for the rubiess
curl -sSL https://get.rvm.io | bash -s stable --ruby

# Python and Pip
# Mac have Python 2.7.2 by default. Update to 3.x is not needed
sudo curl https://raw.github.com/pypa/pip/master/contrib/get-pip.py > /tmp/get-pip.py
sudo python /tmp/get-pip.py
pip install -U pip

# https://github.com/isaacs/nave
# needs npm, obviously.
# TODO: I think i'd rather curl down the nave.sh, symlink it into /bin and use that for initial node install.
npm install -g nave

# homebrew!
# you need the code CLI tools YOU FOOL.
ruby <(curl -fsSkL raw.github.com/mxcl/homebrew/go)

# https://github.com/rupa/z
# z, oh how i love you
curl https://raw.github.com/rupa/z/master/z.sh > ~/dotfiles/utils/z.sh

# I don't use Spotify... and you? :-)
# cd ~/code
# git clone git://github.com/dronir/SpotifyControl.git

# add Dropbox uploader
curl https://raw2.github.com/andreafabrizi/Dropbox-Uploader/master/dropbox_uploader.sh > ~/dotfiles/utils/dropbox

# add nodev
curl https://raw2.github.com/Kikobeats/nodev/master/nodev > ~/dotfiles/utils/nodev

# Ubuntu font (for Sublime Text and iTerm)
wget -P /tmp/ http://font.ubuntu.com/download/ubuntu-font-family-0.80.zip
tar -xvf /tmp/ubuntu-font-family-0.80.zip
sudo mv ubuntu-font-family-0.80/*.ttf ~/Library/Fonts/

# my magic photobooth symlink -> dropbox. I love it.
# first move Photo Booth folder out of Pictures and into dropbox/public
# then:
# ln -s ~/Dropbox/Public/Photo\ Booth/ ~/Pictures/Photo\ Booth
# now you can record photobooth videos quickly and they upload to dropbox DURING RECORDING
# then you grab public URL and send off your video message in a heartbeat.

