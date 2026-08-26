<p align="center">
  <img src="https://i.imgur.com/xDDKc2C.png" width="300">
  <h3 align="center">Kikobeats dotfiles</h3>
  <h5 align="center">Latest version tested: macOS Sequoia 15.7.1</h5>
</p>

## Usage

```bash
git clone https://github.com/Kikobeats/dotfiles && cd dotfiles && ./sync.sh
./boostrap.sh
```

## Recording mode

Fish shows a grey inline autosuggestion after the cursor, which reads as noise
in a screen recording. Toggle it off before hitting record, back on after:

```fish
recording_on   # autosuggestions hidden
recording_off  # autosuggestions restored
```

The flag is a universal variable, so every open terminal changes at once and
the setting survives a restart. Run `./test/recording.sh` to verify.
