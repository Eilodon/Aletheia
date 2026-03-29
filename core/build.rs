fn main() {
    uniffi_build::generate_scaffolding("src/aletheia.udl").expect("failed to generate UniFFI scaffolding");
}
