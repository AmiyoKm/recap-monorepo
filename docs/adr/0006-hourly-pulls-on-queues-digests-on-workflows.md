# Hourly pulls run on Queues, Digests run on Workflows

The hourly cron does no data work itself. It sends one Queue message per active Connection, and the Queue consumer pulls the Activities that are new since that Connection's saved cursor. At 8:00 in each user's time zone, the cron also starts one Workflow per due user. The Workflow does no pull. It lists the Connections that the last Queue pulls did not read, reads the Digest Window, calls the AI, saves the Digest and embeds it. The reason is the Workers free plan: one invocation gets 10 ms CPU, 50 subrequests and 50 D1 queries, and one user's day needs more than that. Each Queue message is its own invocation with its own limits and retries, so one failed Source fails only its own pull. Workflow steps can share one invocation, so their subrequests add up. A final pull in the Workflow went past 50 subrequests before the AI call.

## Considered Options

- **All work inline in the cron**: simple, but one user with six Sources goes past 50 subrequests.
- **Workflows only, one pull a day**: fewer moving parts, but the Activity page is a day old until the next morning.
- **Queues only**: the Digest then needs its own "all pulls are done" tracking, which a Workflow gives for free.

## Consequences

- Free-plan Queues allow 10,000 operations a day. At about 3 operations per message, 6 Connections and 24 pulls a day, that is about 430 operations per user, so about 20 users. More users need the paid plan or fewer pulls a day.
- A pull must page and save in small batches, because a Queue message gets only 10 ms CPU on the free plan.
- A Digest reads only the Activities that the last hourly pull saved. Activity from up to one hour before the run can be missing.
