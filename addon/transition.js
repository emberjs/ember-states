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
  }

  /**
    Normalize the passed in enter, exit and resolve states.

    This process also adds `finalState` and `contexts` to the Transition object.

    @method normalize
    @param {StateManager} manager the state manager running the transition
    @param {Array} contexts a list of contexts passed into `transitionTo`
  */
  normalize(manager) {
    this.addInitialStates();
    this.removeUnchangedContexts(manager);
    return this;
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
  }

  /**
    Remove any states that were added because the number of contexts
    exceeded the number of explicit enter states, but the context has
    not changed since the last time the state was entered.

    @method removeUnchangedContexts
    @param {StateManager} manager passed in to look up the last
      context for a state
  */
  removeUnchangedContexts() {
    // Start from the beginning of the enter states. If the state was added
    // to the list during the context matching phase, make sure the context
    // has actually changed since the last time the state was entered.
    while (this.enterStates.length > 0) {
      if (this.enterStates[0] !== this.exitStates[0]) { break; }

      this.resolveState = this.enterStates.shift();
      this.exitStates.shift();
    }
  }
}
