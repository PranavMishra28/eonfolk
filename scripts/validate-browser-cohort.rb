require "digest"
require "find"

root = "/Users/pranav/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app"
launcher = File.join(root, "Contents/MacOS/Google Chrome for Testing")
framework = File.join(root, "Contents/Frameworks/Google Chrome for Testing Framework.framework/Versions/151.0.7922.34/Google Chrome for Testing Framework")
expected = {
  manifest_bytes: 62_239,
  manifest_hash: "25995bc88bf20b6de47b46eb3571b250989846a797c0b8924b8794627b6175fc",
  files: 326, links: 5, total_bytes: 372_002_382,
  launcher_hash: "a596b1cfc6353e987fcec8d71a23a28cd6a9e7a6b4e20b908e4c4fcffe51158e",
  framework_bytes: 237_813_488,
  framework_hash: "269114cf695f1c50b54e0816a1442e41dc468d28672e2dedc2036105fb5a8dbe"
}
entries = []
Find.find(root) do |path|
  next if path == root
  stat = File.lstat(path)
  rel = path.delete_prefix(root + "/")
  abort "browser cohort violation: unsafe path" if rel.match?(/[\t\n\r]/) || rel.split("/").include?("..")
  if stat.file?
    entries << ["F", rel, path, stat]
  elsif stat.symlink?
    target = File.readlink(path)
    abort "browser cohort violation: unsafe link" if target.match?(/[\t\n\r]/) || target.split("/").include?("..")
    entries << ["L", rel, target, stat]
  elsif !stat.directory?
    abort "browser cohort violation: unsupported object #{rel}"
  end
end
entries.sort_by! { |entry| entry[1].b }
files = 0; links = 0; total = 0
manifest = entries.map do |kind, rel, value, stat|
  mode = format("%04o", stat.mode & 0o7777)
  if kind == "F"
    bytes = File.binread(value); files += 1; total += bytes.bytesize
    "F\t#{rel}\t#{mode}\t#{bytes.bytesize}\t#{Digest::SHA256.hexdigest(bytes)}\n"
  else
    links += 1; "L\t#{rel}\t#{mode}\t#{value}\n"
  end
end.join.b
actual = {
  manifest_bytes: manifest.bytesize, manifest_hash: Digest::SHA256.hexdigest(manifest),
  files: files, links: links, total_bytes: total,
  launcher_hash: Digest::SHA256.file(launcher).hexdigest,
  framework_bytes: File.size(framework), framework_hash: Digest::SHA256.file(framework).hexdigest
}
expected.each { |key, value| abort "browser cohort violation: #{key} #{actual[key]} != #{value}" unless actual[key] == value }
puts "browser cohort valid: #{files} files, #{links} links, #{total} bytes"
