{ pkgs, lib, config, inputs, ... }:

{
  packages = with pkgs; [
    nodejs_26
  ];

  # https://devenv.sh/languages/
  # languages.rust.enable = true;
  # https://devenv.sh/basics/
}
