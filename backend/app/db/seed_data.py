"""Demo data inserted on first start (see seed.py and DECISIONS.md D-13).

Everything is plain data so it can be read like a script of the demo:
  * people are referred to by a handle ("alice"); seed.py maps handles to ids.
  * times are "minutes before now", so the demo always looks recent.
  * a message body that is a dict is a group update (its meta), not text.
  * receipts are described per recipient with two positions in the message list:
    read_upto[x] = last index x has read, delivered_upto[x] = last index delivered to x.
    A recipient missing from read_upto has read everything. This keeps the seeded
    receipts realistic: nobody has read a message while an older one is still unread.
"""

DAY = 24 * 60

USERS = [
    # handle, phone, username, given, family, about, avatar color, last seen (min ago)
    {"handle": "alice", "phone": "+15550100", "username": "alice.42", "given": "Alice", "family": "Chen",
     "about": "Coffee first ☕", "color": "A110", "last_seen": 0},
    {"handle": "bob", "phone": "+15550101", "username": "bobokafor.11", "given": "Bob", "family": "Okafor",
     "about": "At work", "color": "A130", "last_seen": 40},
    {"handle": "carmen", "phone": "+15550102", "username": None, "given": "Carmen", "family": "Ruiz",
     "about": None, "color": "A160", "last_seen": 5},
    {"handle": "dev", "phone": "+15550103", "username": "dev.03", "given": "Dev", "family": "Patel",
     "about": "Available", "color": "A180", "last_seen": 180},
    {"handle": "emma", "phone": "+15550104", "username": None, "given": "Emma", "family": None,
     "about": None, "color": "A140", "last_seen": 2 * DAY},
    {"handle": "farah", "phone": "+15550105", "username": "farah.88", "given": "Farah", "family": "Haddad",
     "about": "Reading, always", "color": "A120", "last_seen": 15},
    {"handle": "george", "phone": "+15550106", "username": None, "given": "George", "family": "Kim",
     "about": None, "color": "A200", "last_seen": 600},
    # Deliberately not in Alice's contacts, to demo "add a new contact".
    {"handle": "hana", "phone": "+15550107", "username": "hana.21", "given": "Hana", "family": "Sato",
     "about": "Busy", "color": "A170", "last_seen": 3000},
]

USERS_CREATED_MINUTES_AGO = 30 * DAY

CONTACTS = {
    "alice": ["bob", "carmen", "dev", "emma", "farah", "george"],
    "bob": ["alice", "carmen", "dev"],
    "carmen": ["alice", "bob"],
    "dev": ["alice", "bob", "carmen"],
    "emma": ["alice", "farah"],
    "farah": ["alice", "emma", "george"],
    "george": ["alice", "farah"],
    "hana": [],
}

CONVERSATIONS = [
    {
        "key": "alice_bob",
        "type": "direct",
        "members": [{"user": "alice"}, {"user": "bob"}],
        "messages": [
            (4400, "bob", "Hey, are you free to help me move on Saturday?"),
            (4395, "alice", "Depends, is there pizza involved?"),
            (4392, "bob", "Pizza and eternal gratitude"),
            (4390, "alice", "Deal. What time?"),
            (4380, "bob", "10am? The van is booked till 2"),
            (4378, "alice", "I'll be there 🚚"),
            (2950, "bob", "Thanks again for yesterday, couldn't have done it without you"),
            (2948, "alice", "Anytime! How's the new place?"),
            (2945, "bob", "Boxes everywhere. Found the kettle though, priorities"),
            (2940, "alice", "That's all that matters"),
            (2900, "bob", "Dinner at mine next week to say thanks?"),
            (2898, "alice", "Yes! I'll bring dessert"),
            (1500, "alice", "Did you ever find the box with the books?"),
            (1490, "bob", "It was in the bathroom. No idea why"),
            (1488, "alice", "Classic moving day logic 😂"),
            (1400, "bob", "Is Thursday good for dinner?"),
            (1395, "alice", "Thursday works"),
            (1390, "bob", "Great, 7pm. Any allergies I should know about?"),
            (1385, "alice", "Nope, I eat everything"),
            (300, "bob", "Btw are you coming on the hike Saturday?"),
            (295, "alice", "Of course, I organised it!"),
            (290, "bob", "Ha, fair. See you there"),
            (70, "alice", "Do you have a spare water bottle? Mine broke"),
            (65, "alice", "Also can you bring sunscreen"),
            (8, "alice", "Never mind, found mine 😅"),
        ],
        # Bob read up to his own last message, got Alice's next two (delivered),
        # then went offline (last seen 40 min ago), so the final one is only "sent".
        "read_upto": {"bob": 21},
        "delivered_upto": {"bob": 23},
    },
    {
        "key": "alice_carmen",
        "type": "direct",
        "members": [{"user": "alice"}, {"user": "carmen"}],
        "messages": [
            (1640, "carmen", "Hey! Are you still selling your bike?"),
            (1635, "alice", "Yes! Still have it, want to see it?"),
            (1630, "carmen", "Yes please, can I come by this weekend?"),
            (1620, "alice", "Sunday afternoon works"),
            (25, "carmen", "Great"),
            (24, "carmen", "Also does it come with the lights?"),
            (12, "carmen", "And what size is the frame? I'm 5'6\""),
        ],
        # Alice's last three incoming messages are delivered but unread -> badge "3".
        "read_upto": {"alice": 3},
        "delivered_upto": {"alice": 6},
    },
    {
        "key": "alice_dev",
        "type": "direct",
        "members": [{"user": "alice"}, {"user": "dev"}],
        "messages": [
            (200, "dev", "Did you push the fix for the login bug?"),
            (195, "alice", "Yep, merged this morning"),
            (190, "dev", "Legend. Standup moved to 10 tomorrow btw"),
            (180, "alice", "Thanks for the heads up 👍"),
        ],
        # Everyone has read everything -> Alice's last message shows "read".
    },
    {
        "key": "alice_emma",
        "type": "direct",
        "members": [{"user": "alice"}, {"user": "emma"}],
        "messages": [
            (6 * DAY + 30, "emma", "Happy birthday!! 🎉 Hope you have the best day"),
            (6 * DAY + 10, "alice", "Thank you Emma!! Miss you, we should catch up soon"),
            (6 * DAY, "emma", "Definitely, I'm back in town end of the month"),
            (300, "alice", "Are you around next weekend? Would love to grab brunch"),
        ],
        # Emma has been offline for 2 days, so Alice's latest is only "sent".
        "read_upto": {"emma": 2},
        "delivered_upto": {"emma": 2},
    },
    {
        "key": "bob_carmen",
        "type": "direct",
        "members": [{"user": "bob"}, {"user": "carmen"}],
        "messages": [
            (2 * DAY, "bob", "Did Alice invite you to the hike?"),
            (2 * DAY - 5, "carmen", "Yes! Are you driving?"),
            (2 * DAY - 9, "bob", "Dev is, apparently. I'm just bringing snacks"),
            (DAY, "carmen", "The best role"),
        ],
    },
    {
        "key": "weekend_hike",
        "type": "group",
        "name": "Weekend Hike",
        "color": "A130",
        "created_by": "alice",
        "members": [
            {"user": "alice", "role": "admin"},
            {"user": "bob"},
            {"user": "carmen"},
            {"user": "dev", "joined": DAY + 120},
        ],
        "messages": [
            (2 * DAY + 60, "alice", {"action": "group_created"}),
            (2 * DAY + 58, "alice", "Who's in for Saturday? Thinking Mount Tam, the Dipsea loop"),
            (2 * DAY + 50, "bob", "In! What time?"),
            (2 * DAY + 45, "carmen", "Me too, as long as we stop for tacos after 🌮"),
            (2 * DAY + 40, "alice", "Tacos are non-negotiable. Meet at the trailhead 8am?"),
            (2 * DAY + 30, "bob", "8 is brutal but ok"),
            (DAY + 120, "alice", {"action": "member_added", "targets": ["dev"]}),
            (DAY + 110, "dev", "Thanks for adding me! I can drive, have room for 3"),
            (DAY + 100, "carmen", "Perfect, pick me up?"),
            (DAY + 95, "dev", "Sure, 7:15 at yours"),
            (30, "alice", "Forecast says sunny, 18°C. Bring layers anyway, it's windy at the top"),
        ],
        # Alice's last message: read by Bob and Carmen, only delivered to Dev (Info-view demo).
        # Dev joined at index 6, so he has no receipts for anything before that.
        "read_upto": {"dev": 9},
        "delivered_upto": {"dev": 10},
    },
    {
        "key": "book_club",
        "type": "group",
        "name": "Book Club",
        "color": "A190",
        "created_by": "farah",
        "members": [
            {"user": "farah", "role": "admin"},
            {"user": "alice"},
            {"user": "george"},
            {"user": "emma"},
            # Removed by Farah; keeps read-only history (soft delete, D-10).
            {"user": "dev", "left": 2 * DAY},
        ],
        "messages": [
            (5 * DAY, "farah", {"action": "group_created"}),
            (5 * DAY - 5, "farah", "Next pick: Piranesi by Susanna Clarke. Two weeks enough?"),
            (5 * DAY - 20, "george", "Works for me"),
            (4 * DAY, "alice", "Started it last night, already hooked"),
            (3 * DAY, "dev", "I'll sit this round out, swamped at work. Catch you next book!"),
            (2 * DAY, "farah", {"action": "member_removed", "targets": ["dev"]}),
            (DAY + 300, "emma", "Halfway through. The statues!!"),
            (DAY + 290, "george", "No spoilers please 🙏"),
            (90, "farah", "Meeting Thursday 7pm at mine? I'll make tea"),
            (60, "emma", "I'll bring biscuits"),
        ],
        # Alice is a plain member (no admin controls) with 2 unread.
        "read_upto": {"alice": 7},
        "delivered_upto": {"alice": 9},
    },
]
