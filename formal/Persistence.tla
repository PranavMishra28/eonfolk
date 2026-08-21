------------------------------ MODULE Persistence ------------------------------
EXTENDS Naturals, FiniteSets, TLC

(***************************************************************************
Bounded persistence model. One abstract event and batch are committed per
accepted command. The TypeScript implementation permits 1--32 events per
batch; that internal batch width does not change these transaction boundaries.
***************************************************************************)

CONSTANTS Commands, MaxRevision, MaxToken, MaxChapters

ASSUME /\ Commands # {}
       /\ MaxRevision \in Nat \ {0}
       /\ MaxToken \in Nat \ {0}
       /\ MaxChapters \in 1..MaxRevision

VARIABLES phase,
          revision,
          lastSequence,
          fence,
          batches,
          events,
          receipts,
          catchStatus,
          nextChapter,
          crashed

vars == << phase, revision, lastSequence, fence, batches, events, receipts,
           catchStatus, nextChapter, crashed >>

DurableVars == << phase, revision, lastSequence, fence, batches, events,
                 receipts, catchStatus, nextChapter >>

Init ==
    /\ phase = "empty"
    /\ revision = 0
    /\ lastSequence = 0
    /\ fence = 0
    /\ batches = {}
    /\ events = {}
    /\ receipts = {}
    /\ catchStatus = "none"
    /\ nextChapter = 0
    /\ crashed = FALSE

Genesis ==
    /\ ~crashed
    /\ phase = "empty"
    /\ phase' = "ready"
    /\ fence' = 1
    /\ UNCHANGED << revision, lastSequence, batches, events, receipts,
                    catchStatus, nextChapter, crashed >>

ClaimFence ==
    /\ ~crashed
    /\ phase = "ready"
    /\ fence < MaxToken
    /\ fence' = fence + 1
    /\ UNCHANGED << phase, revision, lastSequence, batches, events, receipts,
                    catchStatus, nextChapter, crashed >>

Append(command, writerToken) ==
    /\ ~crashed
    /\ phase = "ready"
    /\ writerToken = fence
    /\ command \notin receipts
    /\ revision < MaxRevision
    /\ revision' = revision + 1
    /\ lastSequence' = lastSequence + 1
    /\ batches' = batches \cup {revision + 1}
    /\ events' = events \cup {lastSequence + 1}
    /\ receipts' = receipts \cup {command}
    /\ UNCHANGED << phase, fence, catchStatus, nextChapter, crashed >>

IdempotentRetry(command) ==
    /\ ~crashed
    /\ phase = "ready"
    /\ command \in receipts
    /\ UNCHANGED vars

StaleWriterAttempt(command, writerToken) ==
    /\ ~crashed
    /\ phase = "ready"
    /\ writerToken # fence
    /\ command \notin receipts
    /\ UNCHANGED vars

BeginCatchUp ==
    /\ ~crashed
    /\ phase = "ready"
    /\ catchStatus = "none"
    /\ catchStatus' = "in-progress"
    /\ nextChapter' = 0
    /\ UNCHANGED << phase, revision, lastSequence, fence, batches, events,
                    receipts, crashed >>

AppendCatchUpChapter(command, writerToken) ==
    /\ ~crashed
    /\ phase = "ready"
    /\ catchStatus = "in-progress"
    /\ writerToken = fence
    /\ command \notin receipts
    /\ revision < MaxRevision
    /\ nextChapter < MaxChapters
    /\ revision' = revision + 1
    /\ lastSequence' = lastSequence + 1
    /\ batches' = batches \cup {revision + 1}
    /\ events' = events \cup {lastSequence + 1}
    /\ receipts' = receipts \cup {command}
    /\ nextChapter' = nextChapter + 1
    /\ catchStatus' = IF nextChapter + 1 = MaxChapters
                       THEN "complete"
                       ELSE "in-progress"
    /\ UNCHANGED << phase, fence, crashed >>

Crash ==
    /\ ~crashed
    /\ crashed' = TRUE
    /\ UNCHANGED DurableVars

Recover ==
    /\ crashed
    /\ crashed' = FALSE
    /\ UNCHANGED DurableVars

Next ==
    \/ Genesis
    \/ ClaimFence
    \/ BeginCatchUp
    \/ Crash
    \/ Recover
    \/ \E command \in Commands, writerToken \in 0..MaxToken:
          Append(command, writerToken)
       \/ IdempotentRetry(command)
       \/ StaleWriterAttempt(command, writerToken)
       \/ AppendCatchUpChapter(command, writerToken)

TypeInvariant ==
    /\ phase \in {"empty", "ready"}
    /\ revision \in 0..MaxRevision
    /\ lastSequence \in 0..MaxRevision
    /\ fence \in 0..MaxToken
    /\ batches \subseteq 1..MaxRevision
    /\ events \subseteq 1..MaxRevision
    /\ receipts \subseteq Commands
    /\ catchStatus \in {"none", "in-progress", "complete"}
    /\ nextChapter \in 0..MaxChapters
    /\ crashed \in BOOLEAN

AtomicGenesis ==
    \/ /\ phase = "empty"
       /\ fence = 0
       /\ revision = 0
       /\ lastSequence = 0
       /\ batches = {}
       /\ events = {}
       /\ receipts = {}
       /\ catchStatus = "none"
       /\ nextChapter = 0
    \/ /\ phase = "ready"
       /\ fence >= 1

LedgerHeadAgreement ==
    /\ revision = Cardinality(batches)
    /\ revision = Cardinality(events)
    /\ revision = Cardinality(receipts)
    /\ lastSequence = revision
    /\ batches = 1..revision
    /\ events = 1..lastSequence

CatchUpProgress ==
    /\ nextChapter <= MaxChapters
    /\ (catchStatus = "none" => nextChapter = 0)
    /\ (catchStatus = "in-progress" => nextChapter < MaxChapters)
    /\ (catchStatus = "complete" => nextChapter = MaxChapters)

CrashPreservesDurableShape ==
    crashed => AtomicGenesis /\ LedgerHeadAgreement /\ CatchUpProgress

Spec == Init /\ [][Next]_vars

=============================================================================
