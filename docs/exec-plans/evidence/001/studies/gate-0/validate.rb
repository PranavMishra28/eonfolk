require "digest"
require "json"

dir = __dir__
canonical = lambda do |value|
  case value
  when Hash then "{" + value.keys.sort.map { |key| JSON.generate(key) + ":" + canonical.call(value[key]) }.join(",") + "}"
  when Array then "[" + value.map { |item| canonical.call(item) }.join(",") + "]"
  else JSON.generate(value)
  end
end
hash_object = ->(value) { Digest::SHA256.hexdigest(canonical.call(value)) }
read_canonical = lambda do |name|
  raw = File.binread(File.join(dir, name)); value = JSON.parse(raw)
  abort "gate-0 Ruby validator: noncanonical #{name}" unless raw == canonical.call(value) + "\n"
  value
end
snapshot = read_canonical.call("snapshot.jcs.json")
oracle = read_canonical.call("observable-gate.jcs.json")
abort "gate-0 Ruby validator: identity" unless snapshot["schemaVersion"] == "eonfolk-gate0-snapshot-v1" && snapshot["gateId"] == "gate-0"
answer = snapshot["answerKey"]
expected_answer = { "mara"=>"citizen:mara", "activities"=>"activity:carry-water,activity:exchange-rations,activity:gather-wood", "interaction"=>"interaction:iven,toma|exchange-settled", "autonomy"=>"cannot-command|standing-plan" }
abort "gate-0 Ruby validator: answer key" unless answer == expected_answer
rows = snapshot.dig("treatmentSnapshot", "counterbalance")
abort "gate-0 Ruby validator: rows" unless rows.length == 6 && rows.all? { |row| row.sort == %w[DIR ECH FAC FAM H TRI] }
pairs = rows.flat_map { |row| row.each_cons(2).to_a }
abort "gate-0 Ruby validator: predecessor pairs" unless pairs.uniq.length == 30
actions = %w[verify-private accuse-now abstain]
treatment_snapshot = snapshot["treatmentSnapshot"]
treatments = treatment_snapshot["treatments"]
vectors = treatment_snapshot["vectors"]
abort "gate-0 Ruby validator: vector cardinality" unless vectors.length == 18 && vectors.map { |v| [v["treatmentId"], v["adviceInput"]] }.uniq.length == 18
vectors.each do |vector|
  definition = treatments.fetch(vector["treatmentId"])
  scores = vector["chooserScores"]
  abort "gate-0 Ruby validator: voter list" unless scores.map { |score| score["chooser"] } == definition["voters"]
  scores.each do |score|
    maximum = score["scores"].max
    expected_preference = actions[score["scores"].index(maximum)]
    abort "gate-0 Ruby validator: chooser preference" unless score["preferredAction"] == expected_preference
  end
  totals = actions.to_h { |action| [action, scores.count { |score| score["preferredAction"] == action }] }
  abort "gate-0 Ruby validator: vote totals" unless totals == vector["voteTotals"]
  chosen = if definition["rule"] == "direct"
    vector["adviceInput"]
  elsif definition["rule"] == "individual"
    scores.first.fetch("preferredAction")
  else
    maximum = totals.values.max
    tied = actions.select { |action| totals[action] == maximum }
    if tied.length == 1 || definition["rule"] == "trio"
      tied.first
    else
      mara = scores.find { |score| score["chooser"] == "Mara" }
      tied.max_by { |action| [mara.fetch("scores")[actions.index(action)], -actions.index(action)] }
    end
  end
  abort "gate-0 Ruby validator: resolved choice" unless chosen == vector["chosenAction"]
  disposition = if definition["rule"] == "direct" then "commanded"
    elsif vector["adviceInput"] == chosen then "accepted"
    elsif chosen == "abstain" then "delayed"
    elsif vector["adviceInput"] == "abstain" then "rejected"
    else "reinterpreted" end
  abort "gate-0 Ruby validator: disposition" unless disposition == vector["disposition"]
  abort "gate-0 Ruby validator: terminal hash" unless Digest::SHA256.hexdigest(canonical.call(vector["terminalState"])) == vector["terminalStateHash"]
  abort "gate-0 Ruby validator: consequence key" unless vector["renderedConsequenceKey"] == "gate-0.consequence.#{chosen}"
end
inputs = snapshot["oracleInputs"]
expected = {
  "acceptedTreatmentHash"=>hash_object.call(inputs["acceptedTreatment"]), "acceptedTreatmentId"=>"H",
  "anchorsHash"=>hash_object.call(inputs["anchors"]), "chronicleHash"=>hash_object.call(snapshot.dig("visualFixture", "chronicleBeat")),
  "comparisonContractHash"=>hash_object.call(inputs["comparisonContract"]), "eventIntervalHash"=>nil,
  "fixtureHash"=>hash_object.call(inputs["fixture"]), "gateId"=>"gate-0", "logicalTimelineHash"=>hash_object.call(inputs["logicalTimeline"]),
  "optionOrdersHash"=>hash_object.call(inputs["optionOrders"]), "optionSetsHash"=>hash_object.call(inputs["optionSets"]),
  "questionsHash"=>hash_object.call(inputs["questions"]), "readyPredicateHash"=>hash_object.call(inputs["readyPredicate"]),
  "receiptHash"=>nil, "rendererMode"=>"pixi-semantic", "responseSurfaceHash"=>hash_object.call(inputs["responseSurface"]),
  "routeId"=>"gate-0-combined-study", "routeParams"=>{"observer"=>{"capture"=>"1","fixtureId"=>"gate0-visual-v1","studyId"=>"V01"},"product"=>{"studyId"=>"P01"}},
  "schemaVersion"=>"eonfolk-observable-gate-v1", "scriptHash"=>hash_object.call(inputs["script"]),
  "semanticDomHash"=>hash_object.call(inputs["semanticDom"]), "stateHash"=>hash_object.call(snapshot["region"]), "storyCardHash"=>nil,
  "timersHash"=>hash_object.call(inputs["timers"]), "viewportPngHashes"=>{}
}
%w[desktop-1728x1117 laptop-1366x768 mobile-390x844].each { |id| expected["viewportPngHashes"][id] = Digest::SHA256.file(File.join(dir, "viewports", id + ".png")).hexdigest }
abort "gate-0 Ruby validator: observable oracle" unless expected == oracle
labor = snapshot["laborAdmission"]
abort "gate-0 Ruby validator: labor" unless labor["recordedNonOperatorSeconds"] + labor["openOperatorReservationSeconds"] + labor["protectedMappedHighSeconds"] <= labor["mappedBudgetSeconds"]
puts "gate-0 Ruby artifact valid: oracle #{Digest::SHA256.file(File.join(dir, "observable-gate.jcs.json")).hexdigest}"
