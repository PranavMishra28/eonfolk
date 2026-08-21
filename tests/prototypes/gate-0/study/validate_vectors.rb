#!/usr/bin/env ruby
# Independent Ruby 2.6-compatible validator; it imports no Node implementation.
require "digest"

MASK = 0xffff_ffff
ROWS = {
  "R0" => %w[H FAM DIR TRI ECH FAC], "R1" => %w[FAM TRI H FAC DIR ECH],
  "R2" => %w[TRI FAC FAM ECH H DIR], "R3" => %w[FAC ECH TRI DIR FAM H],
  "R4" => %w[ECH DIR FAC H TRI FAM], "R5" => %w[DIR H ECH FAM FAC TRI]
}.freeze
TREATMENTS = %w[H FAM TRI FAC ECH DIR].freeze

def assert(condition, message)
  raise message unless condition
end

def study_seed(plan_base, gate_id)
  Digest::SHA256.hexdigest("EONFOLK-STUDY-v1\n#{plan_base}\n#{gate_id}")
end

def frame(bytes)
  [bytes.bytesize].pack("N") + bytes
end

def tuple_digest(seed_hex, system, entity, purpose)
  fields = [[seed_hex].pack("H*"), system.encode("UTF-8"), entity.encode("UTF-8"), purpose.encode("UTF-8")]
  Digest::SHA256.hexdigest("EONFOLK-TUPLE-v2\0".b + frame("EONFOLK:PRNG-SEED:v2".b) + fields.map { |field| frame(field) }.join)
end

def rotl(value, amount)
  ((value << amount) | (value >> (32 - amount))) & MASK
end

def generator(digest_hex)
  state = [digest_hex].pack("H*").byteslice(0, 16).unpack("V4")
  state = [0x9e3779b9, 0x243f6a88, 0xb7e15162, 0xdeadbeef] if state.all?(&:zero?)
  lambda do
    result = (rotl((state[1] * 5) & MASK, 7) * 9) & MASK
    temporary = (state[1] << 9) & MASK
    state[2] = (state[2] ^ state[0]) & MASK; state[3] = (state[3] ^ state[1]) & MASK
    state[1] = (state[1] ^ state[2]) & MASK; state[0] = (state[0] ^ state[3]) & MASK
    state[2] = (state[2] ^ temporary) & MASK; state[3] = rotl(state[3], 11)
    result
  end
end

def shuffle(seed, system, entity, purpose, values)
  digest = tuple_digest(seed, system, entity, purpose)
  draw = generator(digest); accepted = []; result = values.dup
  (result.length - 1).downto(1) do |index|
    modulus = index + 1; limit = (0x1_0000_0000 / modulus) * modulus
    value = draw.call while !value || value >= limit
    accepted << value
    result[index], result[value % modulus] = result[value % modulus], result[index]
  end
  [digest, accepted.map { |value| "%08x" % value }, result]
end

6.times { |position| assert(ROWS.values.map { |row| row[position] }.sort == TREATMENTS.sort, "unbalanced position #{position + 1}") }
pairs = ROWS.values.flat_map { |row| row.each_cons(2).map { |a, b| "#{a}>#{b}" } }
assert(pairs.uniq.length == 30, "Williams predecessor pairs are not unique/complete")

zeroes = "0" * 64
plan = "f0ec6a1e34a74d117de84c094286ec703ca7f15f"
assert(study_seed(zeroes, "gate-0") == "47bae548150f2ca338f1128264b676a5841c448d1af75eb3cca4bad4bfd32bec", "synthetic Gate 0 seed")
assert(study_seed(plan, "gate-0") == "5a9fda2968af9b50cf98bef59439ae13517567f67bbeadc478bc95fb1df0fcbb", "operational Gate 0 seed")

citizens = %w[citizen:mara citizen:toma citizen:iven citizen:sera citizen:nadi citizen:owen citizen:bela citizen:corin]
[
  ["989acf8b324a94eea94f329b69d531b4f9858f39d0bde06bd8acfc59f0e060c5", "55dbdcedb82c5b9474936f59e44cc46939ec8094301da988056523d8ef5065de", %w[036e3002 6cd77562 cadd12e5 7dbf2134 120055ff 7216d0c6 62a4b8b2], %w[citizen:nadi citizen:mara citizen:corin citizen:sera citizen:bela citizen:toma citizen:owen citizen:iven]],
  ["02984ccce263f44914bb3cbdec719f9f6c3f472cd0e493c9aabc332ec56eee82", "e572b98be08d90d65746cedaadd9dbc8d71065ab359844046bacf3c286ca530f", %w[b47830d8 ddc9b7eb abedd826 1198e900 c69a6114 fe58066f 41a3e480], %w[citizen:bela citizen:nadi citizen:sera citizen:corin citizen:owen citizen:iven citizen:toma citizen:mara]]
].each do |seed, expected_digest, expected_draws, expected_order|
  digest, draws, order = shuffle(seed, "study-options", "A01/observer", "point-mara", citizens)
  assert([digest, draws, order] == [expected_digest, expected_draws, expected_order], "Gate A V2 option sentinel")
end

[
  ["2447c5c4268a3e39ba7d06ba29696c128ad5dfcf44e6da4de9cac2edd7307b1c", "4ef29a4d2f43467b8fff3ac119fd111ac0a0e7687de235523ab58f2956f92efd", %w[ace7a354 bdefeec3 aba626bb a99d88ba caee71a8 b99d08d9 4074cafa], %w[P06 P03 P08 P01 P04 P07 P02 P05]],
  ["dde11028c10ea0192f31ce394f3d974bf0b4f7a93e7259d594748a6002cbd88b", "0ecc9e216edd4378de1d10e6764bf3e1e4d3cecaf6e137342c78e555dd97b09b", %w[f6f62c8c 859eb657 6d8a0dcb f17040a0 2d2036b1 9b9ba37f 4c6efb98], %w[P04 P07 P01 P06 P03 P02 P08 P05]]
].each do |seed, expected_digest, expected_draws, expected_order|
  digest, draws, order = shuffle(seed, "study", "gate-b", "assignment", %w[P01 P02 P03 P04 P05 P06 P07 P08])
  assert([digest, draws, order] == [expected_digest, expected_draws, expected_order], "Gate B V2 assignment sentinel")
end

puts "PASS Williams + synthetic/operational Gate 0 seeds + V2 Gate A/Gate B vectors"
