// 같이 정하기 동점 투표 (US-28). 1·2위가 비슷하면 앱들이 같은 상위 4개를 계산해서 vote:open으로 보내고,
// 각자 4강에서 고른 메뉴를 한 표로 낸다. 다수결이고, 동점이면 서버가 무작위로 정해서
// 모든 폰에 같은 우승 메뉴가 나온다.

const MIN_CANDIDATES = 2;
const MAX_CANDIDATES = 4;
const MENU_NAME_MAX_LENGTH = 40;

class GroupVote {
  constructor({ candidates, deadline }) {
    this.candidates = candidates;
    this.deadline = deadline;
    this.votes = new Map(); // participantId → menu
    this.winner = null;
    this.tally = null;
  }

  /** 앱이 보낸 후보 목록을 확인한다. 문제가 있으면 null */
  static readCandidates(value) {
    if (!Array.isArray(value)) return null;
    const names = value.map((v) => (typeof v === 'string' ? v.trim() : ''));
    if (names.some((n) => !n || n.length > MENU_NAME_MAX_LENGTH)) return null;
    if (new Set(names).size !== names.length) return null;
    if (names.length < MIN_CANDIDATES || names.length > MAX_CANDIDATES) return null;
    return names;
  }

  hasVoted(participantId) {
    return this.votes.has(participantId);
  }

  cast(participantId, menu) {
    this.votes.set(participantId, menu);
  }

  /** 지금 남아 있는 사람의 표만 센다. 가장 많이 받은 메뉴가 여럿이면 random으로 하나 */
  decide(memberIds, random) {
    const tally = Object.fromEntries(this.candidates.map((c) => [c, 0]));
    for (const id of memberIds) {
      const menu = this.votes.get(id);
      if (menu) tally[menu] += 1;
    }
    const top = Math.max(...Object.values(tally));
    const leaders = this.candidates.filter((c) => tally[c] === top);
    this.winner = leaders[Math.min(leaders.length - 1, Math.floor(random() * leaders.length))];
    this.tally = tally;
    this.deadline = null;
    return this.winner;
  }

  view(memberIds) {
    return {
      candidates: this.candidates,
      deadline: this.deadline,
      votedIds: memberIds.filter((id) => this.votes.has(id)),
      winner: this.winner,
      tally: this.tally
    };
  }
}

module.exports = { GroupVote, MIN_CANDIDATES, MAX_CANDIDATES };
