# Kikobeats dotfiles

> Based on [addyosmani dotfiles](https://github.com/addyosmani/dotfiles).
> Latest version tested: macOS Sierra 12.0.1

### Features

* fish shell + fisher manager
* Install common package manager (brew, npm, gem) and common dependencies  (linters, findutils, redis, mongo, bash,...)
* Install common apps based on [Caskfile](https://github.com/Kikobeats/dotfiles/blob/master/Caskfile).
* Many useful alias for terminal: git, browsers, apps shortcuts, finder, hidden/show icons desktop, youtube downloader, RAMDisk,...
* Custom command for update and clean the system, dropbox, js2CoffePro, nodev, RAMDisk, mount/unmount EFI,...

### Installation

```bash
git clone https://github.com/Kikobeats/dotfiles  && cd dotfiles && ./sync-local.sh
```

## Usage

```
./install-deps.sh && ./macos && ./brew
```