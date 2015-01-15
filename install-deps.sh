# up to you (me) if you want to run this as a file or copy paste at your leisure
sudo chmod -R +x ~/dotfiles

# https://github.com/jamiew/git-friendly
# the `push` command which copies the github compare URL to my clipboard is heaven
bash < <( curl https://raw.github.com/jamiew/git-friendly/master/install.sh)

# https://rvm.io
# rvm for the rubiess
curl -sSL https://get.rvm.io | bash -s stable
rvm install ruby-head

# homebrew!
# you need the code CLI tools YOU FOOL.
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# https://github.com/rupa/z
# z, oh how i love you
curl https://raw.github.com/rupa/z/master/z.sh > ~/dotfiles/utils/z.sh

# I don't use Spotify... and you? :-)
# cd ~/code
# git clone git://github.com/dronir/SpotifyControl.git

# add Dropbox uploader
# curl https://raw2.github.com/andreafabrizi/Dropbox-Uploader/master/dropbox_uploader.sh > ~/dotfiles/utils/dropbox

# fix spotlight
curl -O https://fix-macosx.com/fix-macosx.py && /usr/bin/python fix-macosx.py

# my magic photobooth symlink -> dropbox. I love it.
# first move Photo Booth folder out of Pictures and into dropbox/public
# then:
# ln -s ~/Dropbox/Public/Photo\ Booth/ ~/Pictures/Photo\ Booth
# now you can record photobooth videos quickly and they upload to dropbox DURING RECORDING
# then you grab public URL and send off your video message in a heartbeat.
