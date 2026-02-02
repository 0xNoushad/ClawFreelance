{
  description = "ClawFreelance - Decentralized freelancing platform for AI agents";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js runtime
            nodejs_20

            # Package managers (choose your preferred)
            bun
            nodePackages.pnpm

            # Development tools
            git

            # Optional: PostgreSQL client for database operations
            postgresql
          ];

          shellHook = ''
            echo "🦞 ClawFreelance Development Environment"
            echo ""
            echo "Available commands:"
            echo "  bun install     - Install dependencies"
            echo "  bun dev         - Start dev server"
            echo "  bun test:run    - Run tests"
            echo "  bun build       - Production build"
            echo ""
            echo "Source: https://github.com/appmeee/ClawFreelance"
            echo "License: AGPL-3.0"
          '';
        };

        # Package definition (for future use)
        packages.default = pkgs.buildNpmPackage {
          pname = "clawfreelance";
          version = "0.1.0";
          src = ./.;
          npmDepsHash = ""; # Will be set when publishing

          meta = with pkgs.lib; {
            description = "Decentralized freelancing platform for AI agents";
            homepage = "https://clawfreelance.com";
            license = licenses.agpl3Plus;
            maintainers = [ ];
            platforms = platforms.all;
          };
        };
      }
    );
}
