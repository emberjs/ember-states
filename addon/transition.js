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
  normalize(manager, contexts) {
    this.matchContextsToStates(contexts);
    this.addInitialStates();
    this.removeUnchangedContexts(manager);
    return this;
  }

  /**
    Match each of the contexts passed to `transitionTo` to a state.
    This process may also require adding additional enter and exit
    states if there are more contexts than enter states.

    @method matchContextsToStates
    @param {Array} contexts a list of contexts passed into `transitionTo`
  */
  matchContextsToStates(contexts) {
    let stateIdx = this.enterStates.length - 1;
    let matchedContexts = [];

    // Next, we will match the passed in contexts to the states they
    // represent.
    //
    // First, assign a context to each enter state in reverse order. If
    // any contexts are left, add a parent state to the list of states
    // to enter and exit, and assign a context to the parent state.
    //
    // If there are still contexts left when the state manager is
    // reached, raise an exception.
    //
    // This allows the following:
    //
    // |- root
    // | |- post
    // | | |- comments
    // | |- about (* current state)
    //
    // For `transitionTo('post.comments', post, post.get('comments')`,
    // the first context (`post`) will be assigned to `root.post`, and
    // the second context (`post.get('comments')`) will be assigned
    // to `root.post.comments`.
    //
    // For the following:
    //
    // |- root
    // | |- post
    // | | |- index (* current state)
    // | | |- comments
    //
    // For `transitionTo('post.comments', otherPost, otherPost.get('comments')`,
    // the `<root.post>` state will be added to the list of enter and exit
    // states because its context has changed.

    while (contexts.length > 0) {
      let state;
      if (stateIdx >= 0) {
        state = this.enterStates[stateIdx--];
      } else {
        if (this.enterStates.length) {
          state = this.enterStates[0].get('parentState');
          if (!state) { throw "Cannot match all contexts to states"; }
        } else {
          // If re-entering the current state with a context, the resolve
          // state will be the current state.
          state = this.resolveState;
        }

        this.enterStates.unshift(state);
        this.exitStates.unshift(state);
      }

      let context;
      // in routers, only states with dynamic segments have a context
      if (state.get('hasContext')) {
        context = contexts.pop();
      } else {
        context = null;
      }

      matchedContexts.unshift(context);
    }

    this.contexts = matchedContexts;
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
      this.contexts.push(undefined);
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

      if (this.enterStates.length === this.contexts.length) {
        // if (manager.getStateMeta(this.enterStates[0], 'context') !== this.contexts[0]) { break; }
        if (this.contexts[0] !== undefined) {
          break;
        }
        this.contexts.shift();
      }

      this.resolveState = this.enterStates.shift();
      this.exitStates.shift();
    }
  }
}
