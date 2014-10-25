#!/bin/bash -v
sudo -v

## MacOSX
sudo softwareupdate -i -a

## brew
cd "$(brew --prefix)"
git fetch origin
git reset --hard origin/master
brew update
brew upgrade
sudo brew cleanup

## npm
sudo npm cache clean
npm-check-updates -g
read -p "Update packages manually and press any key... " -n 1
sudo chown -R "$(whoami)" ~/.npm
sudo chown -R "$(whoami)" /usr/local

## cabal
cabal update
cabal install cabal-install --force-reinstalls

## rvm
rvm get stable

## ruby
sudo gem update --system
sudo gem update
sudo gem cleanup

## zsh
upgrade_oh_my_zsh

# finish
diskutil repairPermissions /
brew doctor
read -p "Fixed problem and press any key... " -n 1


## clean system
read -p "System Updated. Clean now? (y/n) " -n 1
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  . clean
fi