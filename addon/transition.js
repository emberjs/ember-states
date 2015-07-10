/**
  A Transition takes the enter, exit and resolve states and normalizes
  them:

  * takes any passed in contexts into consideration
  * adds in `initialState`s

  @class Transition
  @private
*/
export default class Transition {
  constructor(raw) {
    this.enterStates = raw.enterStates.slice();
    this.exitStates = raw.exitStates.slice();
    this.resolveState = raw.resolveState;

    this.finalState = raw.enterStates[raw.enterStates.length - 1] || raw.resolveState;

    this.addInitialStates();
  }

  /**
    Add any `initialState`s to the list of enter states.

    @method addInitialStates
  */
  addInitialStates() {
    let finalState = this.finalState;

    while(true) {
      let initialState = finalState.get('initialState') || 'start';
      finalState = finalState.get('states.' + initialState);

      if (!finalState) { break; }

      this.finalState = finalState;
      this.enterStates.push(finalState);
    }
    while (this.enterStates.length > 0) {
      if (this.enterStates[0] !== this.exitStates[0]) { break; }

      this.resolveState = this.enterStates.shift();
      this.exitStates.shift();
    }
  }
}
