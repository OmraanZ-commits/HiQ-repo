{pkgs}: {
  deps = [
    pkgs.mesa
    pkgs.xorg.libXrandr
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libX11
    pkgs.libdrm
    pkgs.cups
    pkgs.at-spi2-core
    pkgs.nspr
    pkgs.nss
    pkgs.glib
  ];
}
