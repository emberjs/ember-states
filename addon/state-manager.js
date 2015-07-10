import Ember from 'ember';
import State from './state';
import Transition from './transition';

/**
@module ember
@submodule ember-states
*/

const get = Ember.get;

function forEach(array, callback, binding) {
  for (let i=0; i<array.length; i++) {
    callback.call(binding, array[i], i);
  }
}

/**
  Sends the event to the currentState, if the event is not handled this method
  will proceed to call the parentState recursively until it encounters an
  event handler or reaches the top or root of the state path hierarchy.

  @method sendRecursively
  @param event
  @param currentState
  @param isUnhandledPass
*/
function sendRecursively(event, currentState, isUnhandledPass) {
  var log = this.enableLogging,
      eventName = isUnhandledPass ? 'unhandledEvent' : event,
      action = currentState[eventName],
      contexts, sendRecursiveArguments, actionArguments;

  contexts = [].slice.call(arguments, 3);

  // Test to see if the action is a method that
  // can be invoked. Don't blindly check just for
  // existence, because it is possible the state
  // manager has a child state of the given name,
  // and we should still raise an exception in that
  // case.
  if (typeof action === 'function') {
    if (log) {
      if (isUnhandledPass) {
        Ember.Logger.log(`STATEMANAGER: Unhandled event '${event}' being sent to state ${currentState.get('path')}.`);
      } else {
        Ember.Logger.log(`STATEMANAGER: Sending event '${event}' to state ${currentState.get('path')}.`);
      }
    }

    actionArguments = contexts;
    if (isUnhandledPass) {
      actionArguments.unshift(event);
    }
    actionArguments.unshift(this);

    return action.apply(currentState, actionArguments);
  } else {
    var parentState = get(currentState, 'parentState');
    if (parentState) {

      sendRecursiveArguments = contexts;
      sendRecursiveArguments.unshift(event, parentState, isUnhandledPass);

      return sendRecursively.apply(this, sendRecursiveArguments);
    } else if (!isUnhandledPass) {
      return sendEvent.call(this, event, contexts, true);
    }
  }
}

/**
  Send an event to the currentState.

  @method sendEvent
  @param eventName
  @param sendRecursiveArguments
  @param isUnhandledPass
*/
function sendEvent(eventName, sendRecursiveArguments, isUnhandledPass) {
  sendRecursiveArguments.unshift(eventName, this.get('currentState'), isUnhandledPass);
  return sendRecursively.apply(this, sendRecursiveArguments);
}

/**
  StateManager is part of Ember's implementation of a finite state machine. A
  StateManager instance manages a number of properties that are instances of
  `State`,
  tracks the current active state, and triggers callbacks when states have changed.

  ## Defining States

  The states of StateManager can be declared in one of two ways. First, you can
  define a `states` property that contains all the states:

  ```javascript
  var managerA = StateManager.create({
    states: {
      stateOne: State.create(),
      stateTwo: State.create()
    }
  });

  managerA.get('states');
  // {
  //   stateOne: State.create(),
  //   stateTwo: State.create()
  // }
  ```

  You can also add instances of `State` (or an `State` subclass)
  directly as properties of a StateManager. These states will be collected into
  the `states` property for you.

  ```javascript
  var managerA = StateManager.create({
    stateOne: State.create(),
    stateTwo: State.create()
  });

  managerA.get('states');
  // {
  //   stateOne: State.create(),
  //   stateTwo: State.create()
  // }
  ```

  ## The Initial State

  When created, a StateManager instance will immediately enter into the state
  defined as its `start` property or the state referenced by name in its
  `initialState` property:

  ```javascript
  var managerA = StateManager.create({
    start: State.create({})
  });

  managerA.get('currentState.name'); // 'start'

  var managerB = StateManager.create({
    initialState: 'beginHere',
    beginHere: State.create({})
  });

  managerB.get('currentState.name'); // 'beginHere'
  ```

  ## Moving Between States

  A StateManager can have any number of `State` objects as properties
  and can have a single one of these states as its current state.

  Calling `transitionTo` transitions between states:

  ```javascript
  var robotManager = StateManager.create({
    initialState: 'poweredDown',
    poweredDown: State.create({}),
    poweredUp: State.create({})
  });

  robotManager.get('currentState.name'); // 'poweredDown'
  robotManager.transitionTo('poweredUp');
  robotManager.get('currentState.name'); // 'poweredUp'
  ```

  Before transitioning into a new state the existing `currentState` will have
  its `exit` method called with the StateManager instance as its first argument
  and an object representing the transition as its second argument.

  After transitioning into a new state the new `currentState` will have its
  `enter` method called with the StateManager instance as its first argument
  and an object representing the transition as its second argument.

  ```javascript
  var robotManager = StateManager.create({
    initialState: 'poweredDown',
    poweredDown: State.create({
      exit(stateManager) {
        console.log("exiting the poweredDown state")
      }
    }),
    poweredUp: State.create({
      enter(stateManager) {
        console.log("entering the poweredUp state. Destroy all humans.")
      }
    })
  });

  robotManager.get('currentState.name'); // 'poweredDown'
  robotManager.transitionTo('poweredUp');

  // will log
  // 'exiting the poweredDown state'
  // 'entering the poweredUp state. Destroy all humans.'
  ```

  Once a StateManager is already in a state, subsequent attempts to enter that
  state will not trigger enter or exit method calls. Attempts to transition
  into a state that the manager does not have will result in no changes in the
  StateManager's current state:

  ```javascript
  var robotManager = StateManager.create({
    initialState: 'poweredDown',
    poweredDown: State.create({
      exit(stateManager) {
        console.log("exiting the poweredDown state")
      }
    }),
    poweredUp: State.create({
      enter(stateManager) {
        console.log("entering the poweredUp state. Destroy all humans.")
      }
    })
  });

  robotManager.get('currentState.name'); // 'poweredDown'
  robotManager.transitionTo('poweredUp');
  // will log
  // 'exiting the poweredDown state'
  // 'entering the poweredUp state. Destroy all humans.'
  robotManager.transitionTo('poweredUp'); // no logging, no state change

  robotManager.transitionTo('someUnknownState'); // silently fails
  robotManager.get('currentState.name'); // 'poweredUp'
  ```

  Each state property may itself contain properties that are instances of
  `State`. The StateManager can transition to specific sub-states in a
  series of transitionTo method calls or via a single transitionTo with the
  full path to the specific state. The StateManager will also keep track of the
  full path to its currentState

  ```javascript
  var robotManager = StateManager.create({
    initialState: 'poweredDown',
    poweredDown: State.create({
      charging: State.create(),
      charged: State.create()
    }),
    poweredUp: State.create({
      mobile: State.create(),
      stationary: State.create()
    })
  });

  robotManager.get('currentState.name'); // 'poweredDown'

  robotManager.transitionTo('poweredUp');
  robotManager.get('currentState.name'); // 'poweredUp'

  robotManager.transitionTo('mobile');
  robotManager.get('currentState.name'); // 'mobile'

  // transition via a state path
  robotManager.transitionTo('poweredDown.charging');
  robotManager.get('currentState.name'); // 'charging'

  robotManager.get('currentState.path'); // 'poweredDown.charging'
  ```

  Enter transition methods will be called for each state and nested child state
  in their hierarchical order. Exit methods will be called for each state and
  its nested states in reverse hierarchical order.

  Exit transitions for a parent state are not called when entering into one of
  its child states, only when transitioning to a new section of possible states
  in the hierarchy.

  ```javascript
  var robotManager = StateManager.create({
    initialState: 'poweredDown',
    poweredDown: State.create({
      enter() {},
      exit() {
        console.log("exited poweredDown state")
      },
      charging: State.create({
        enter() {},
        exit() {}
      }),
      charged: State.create({
        enter() {
          console.log("entered charged state")
        },
        exit() {
          console.log("exited charged state")
        }
      })
    }),
    poweredUp: State.create({
      enter() {
        console.log("entered poweredUp state")
      },
      exit() {},
      mobile: State.create({
        enter() {
          console.log("entered mobile state")
        },
        exit() {}
      }),
      stationary: State.create({
        enter() {},
        exit() {}
      })
    })
  });


  robotManager.get('currentState.path'); // 'poweredDown'
  robotManager.transitionTo('charged');
  // logs 'entered charged state'
  // but does *not* log  'exited poweredDown state'
  robotManager.get('currentState.name'); // 'charged

  robotManager.transitionTo('poweredUp.mobile');
  // logs
  // 'exited charged state'
  // 'exited poweredDown state'
  // 'entered poweredUp state'
  // 'entered mobile state'
  ```

  During development you can set a StateManager's `enableLogging` property to
  `true` to receive console messages of state transitions.

  ```javascript
  var robotManager = StateManager.create({
    enableLogging: true
  });
  ```

  ## Managing currentState with Actions

  To control which transitions are possible for a given state, and
  appropriately handle external events, the StateManager can receive and
  route action messages to its states via the `send` method. Calling to
  `send` with an action name will begin searching for a method with the same
  name starting at the current state and moving up through the parent states
  in a state hierarchy until an appropriate method is found or the StateManager
  instance itself is reached.

  If an appropriately named method is found it will be called with the state
  manager as the first argument and an optional `context` object as the second
  argument.

  ```javascript
  var managerA = StateManager.create({
    initialState: 'stateOne.substateOne.subsubstateOne',
    stateOne: State.create({
      substateOne: State.create({
        anAction(manager, context) {
          console.log("an action was called")
        },
        subsubstateOne: State.create({})
      })
    })
  });

  managerA.get('currentState.name'); // 'subsubstateOne'
  managerA.send('anAction');
  // 'stateOne.substateOne.subsubstateOne' has no anAction method
  // so the 'anAction' method of 'stateOne.substateOne' is called
  // and logs "an action was called"
  // with managerA as the first argument
  // and no second argument

  var someObject = {};
  managerA.send('anAction', someObject);
  // the 'anAction' method of 'stateOne.substateOne' is called again
  // with managerA as the first argument and
  // someObject as the second argument.
  ```

  If the StateManager attempts to send an action but does not find an appropriately named
  method in the current state or while moving upwards through the state hierarchy, it will
  repeat the process looking for a `unhandledEvent` method. If an `unhandledEvent` method is
  found, it will be called with the original event name as the second argument. If an
  `unhandledEvent` method is not found, the StateManager will throw a new Ember.Error.

  ```javascript
  var managerB = StateManager.create({
    initialState: 'stateOne.substateOne.subsubstateOne',
    stateOne: State.create({
      substateOne: State.create({
        subsubstateOne: State.create({}),
        unhandledEvent(manager, eventName, context) {
          console.log("got an unhandledEvent with name " + eventName);
        }
      })
    })
  });

  managerB.get('currentState.name'); // 'subsubstateOne'
  managerB.send('anAction');
  // neither `stateOne.substateOne.subsubstateOne` nor any of it's
  // parent states have a handler for `anAction`. `subsubstateOne`
  // also does not have a `unhandledEvent` method, but its parent
  // state, `substateOne`, does, and it gets fired. It will log
  // "got an unhandledEvent with name anAction"
  ```

  Action detection only moves upwards through the state hierarchy from the current state.
  It does not search in other portions of the hierarchy.

  ```javascript
  var managerC = StateManager.create({
    initialState: 'stateOne.substateOne.subsubstateOne',
    stateOne: State.create({
      substateOne: State.create({
        subsubstateOne: State.create({})
      })
    }),
    stateTwo: State.create({
      anAction(manager, context) {
        // will not be called below because it is
        // not a parent of the current state
      }
    })
  });

  managerC.get('currentState.name'); // 'subsubstateOne'
  managerC.send('anAction');
  // Error: <StateManager:ember132> could not
  // respond to event anAction in state stateOne.substateOne.subsubstateOne.
  ```

  Inside of an action method the given state should delegate `transitionTo` calls on its
  StateManager.

  ```javascript
  var robotManager = StateManager.create({
    initialState: 'poweredDown.charging',
    poweredDown: State.create({
      charging: State.create({
        chargeComplete(manager, context) {
          manager.transitionTo('charged')
        }
      }),
      charged: State.create({
        boot(manager, context) {
          manager.transitionTo('poweredUp')
        }
      })
    }),
    poweredUp: State.create({
      beginExtermination(manager, context) {
        manager.transitionTo('rampaging')
      },
      rampaging: State.create()
    })
  });

  robotManager.get('currentState.name'); // 'charging'
  robotManager.send('boot'); // throws error, no boot action
                            // in current hierarchy
  robotManager.get('currentState.name'); // remains 'charging'

  robotManager.send('beginExtermination'); // throws error, no beginExtermination
                                          // action in current hierarchy
  robotManager.get('currentState.name');   // remains 'charging'

  robotManager.send('chargeComplete');
  robotManager.get('currentState.name');   // 'charged'

  robotManager.send('boot');
  robotManager.get('currentState.name');   // 'poweredUp'

  robotManager.send('beginExtermination', allHumans);
  robotManager.get('currentState.name');   // 'rampaging'
  ```

  Transition actions can also be created using the `transitionTo` method of the `State` class. The
  following example StateManagers are equivalent:

  ```javascript
  var aManager = StateManager.create({
    stateOne: State.create({
      changeToStateTwo: State.transitionTo('stateTwo')
    }),
    stateTwo: State.create({})
  });

  var bManager = StateManager.create({
    stateOne: State.create({
      changeToStateTwo(manager, context) {
        manager.transitionTo('stateTwo', context)
      }
    }),
    stateTwo: State.create({})
  });
  ```

  @class StateManager
  @namespace Ember
  @extends State
**/
export default State.extend({
  /**
    @private

    When creating a new statemanager, look for a default state to transition
    into. This state can either be named `start`, or can be specified using the
    `initialState` property.

    @method init
  */
  init() {
    this._super();

    var initialState = this.get('initialState');

    if (!initialState && this.get('states.start')) {
      initialState = 'start';
    }

    if (initialState) {
      this.transitionTo(initialState);
      Ember.assert('Failed to transition to initial state "' + initialState + '"', !!this.get('currentState'));
    }
  },

  /**
    The current state from among the manager's possible states. This property should
    not be set directly. Use `transitionTo` to move between states by name.

    @property currentState
    @type State
  */
  currentState: null,

  /**
   The path of the current state. Returns a string representation of the current
   state.

   @property currentPath
   @type String
  */
  currentPath: Ember.computed.alias('currentState.path'),

  /**
    The name of transitionEvent that this stateManager will dispatch

    @property transitionEvent
    @type String
    @default 'setup'
  */
  transitionEvent: 'setup',

  /**
    If set to true, `errorOnUnhandledEvents` will cause an exception to be
    raised if you attempt to send an event to a state manager that is not
    handled by the current state or any of its parent states.

    @property errorOnUnhandledEvents
    @type Boolean
    @default true
  */
  errorOnUnhandledEvent: true,

  /**
    An alias to sendEvent method

    @method send
    @param event
  */
  send(event) {
    var contexts = [].slice.call(arguments, 1);
    Ember.assert('Cannot send event "' + event + '" while currentState is ' + get(this, 'currentState'), get(this, 'currentState'));
    return sendEvent.call(this, event, contexts, false);
  },

  /**
    If errorOnUnhandledEvent is true this event with throw an Ember.Error
    indicating that the no state could respond to the event passed through the
    state machine.

    @method unhandledEvent
    @param manager
    @param event
  */
  unhandledEvent(manager, event) {
    if (get(this, 'errorOnUnhandledEvent')) {
      throw new Ember.Error(this.toString() + " could not respond to event " + event + " in state " + get(this, 'currentState.path') + ".");
    }
  },

  /**
    Finds a state by its state path.

    Example:

    ```javascript
    var manager = StateManager.create({
      root: State.create({
        dashboard: State.create()
      })
    });

    manager.getStateByPath(manager, "root.dashboard");
    // returns the dashboard state

    var aState = manager.getStateByPath(manager, "root.dashboard");

    var path = aState.get('path');
    // path is 'root.dashboard'

    var name = aState.get('name');
    // name is 'dashboard'
    ```

    @method getStateByPath
    @param {State} root the state to start searching from
    @param {String} path the state path to follow
    @return {State} the state at the end of the path
  */
  getStateByPath(root, path) {
    var parts = path.split('.'),
        state = root;

    for (var i=0, len=parts.length; i<len; i++) {
      state = get(get(state, 'states'), parts[i]);
      if (!state) { break; }
    }

    return state;
  },

  findStateByPath(state, path) {
    var possible;

    while (!possible && state) {
      possible = this.getStateByPath(state, path);
      state = get(state, 'parentState');
    }

    return possible;
  },

  /**
    A state stores its child states in its `states` hash.
    This code takes a path like `posts.show` and looks
    up `root.states.posts.states.show`.

    It returns a list of all of the states from the
    root, which is the list of states to call `enter`
    on.

    @method getStatesInPath
    @param root
    @param path
  */
  getStatesInPath(root, path) {
    if (!path || path === "") { return undefined; }
    let parts = path.split('.');
    let result = [];

    for (let i=0, len=parts.length; i<len; i++) {
      let states = get(root, 'states');
      if (!states) { return undefined; }
      let state = get(states, parts[i]);
      if (state) { root = state; result.push(state); }
      else { return undefined; }
    }

    return result;
  },

  /**
    Transition to another state within the state machine. If the path is empty returns
    immediately. This method attempts to get a hash of the enter, exit and resolve states
    from the existing state cache. Processes the raw state information based on the
    passed in context. Creates a new transition object and triggers a new setupContext.

    @method transitionTo
    @param path
    @param context
  */
  transitionTo(path) {
    // XXX When is transitionTo called with no path
    if (Ember.isEmpty(path)) { return; }

    // The ES6 signature of this function is `path, ...contexts`
    let currentState = get(this, 'currentState') || this;

    // First, get the enter, exit and resolve states for the current state
    // and specified path. If possible, use an existing cache.
    let hash = this.contextFreeTransition(currentState, path);

    // Next, process the raw state information for the contexts passed in.
    let transition = new Transition(hash);

    this.enterState(transition);
    this.triggerSetupContext(transition);
  },

  /**
    Allows you to transition to any other state in the state manager without
    being constrained by the state hierarchy of the current state path.
    This method will traverse the state path upwards through its parents until
    it finds the specified state path. All the transitions are captured during the
    traversal.

    Caches and returns hash of transitions, which contain the exitSates, enterStates and
    resolvedState

    @method contextFreeTransition
    @param currentState
    @param path
  */
  contextFreeTransition(currentState, path) {
    var cache = currentState.getPathsCache(this, path);
    if (cache) { return cache; }

    var enterStates = this.getStatesInPath(currentState, path),
        exitStates = [],
        resolveState = currentState;

    // Walk up the states. For each state, check whether a state matching
    // the `path` is nested underneath. This will find the closest
    // parent state containing `path`.
    //
    // This allows the user to pass in a relative path. For example, for
    // the following state hierarchy:
    //
    //    | |root
    //    | |- posts
    //    | | |- show (* current)
    //    | |- comments
    //    | | |- show
    //
    // If the current state is `<root.posts.show>`, an attempt to
    // transition to `comments.show` will match `<root.comments.show>`.
    //
    // First, this code will look for root.posts.show.comments.show.
    // Next, it will look for root.posts.comments.show. Finally,
    // it will look for `root.comments.show`, and find the state.
    //
    // After this process, the following variables will exist:
    //
    // * resolveState: a common parent state between the current
    //   and target state. In the above example, `<root>` is the
    //   `resolveState`.
    // * enterStates: a list of all of the states represented
    //   by the path from the `resolveState`. For example, for
    //   the path `root.comments.show`, `enterStates` would have
    //   `[<root.comments>, <root.comments.show>]`
    // * exitStates: a list of all of the states from the
    //   `resolveState` to the `currentState`. In the above
    //   example, `exitStates` would have
    //   `[<root.posts>`, `<root.posts.show>]`.
    while (resolveState && !enterStates) {
      exitStates.unshift(resolveState);

      resolveState = get(resolveState, 'parentState');
      if (!resolveState) {
        enterStates = this.getStatesInPath(this, path);
        if (!enterStates) {
          Ember.assert('Could not find state for path: "'+path+'"');
          return;
        }
      }
      enterStates = this.getStatesInPath(resolveState, path);
    }

    // If the path contains some states that are parents of both the
    // current state and the target state, remove them.
    //
    // For example, in the following hierarchy:
    //
    // |- root
    // | |- post
    // | | |- index (* current)
    // | | |- show
    //
    // If the `path` is `root.post.show`, the three variables will
    // be:
    //
    // * resolveState: `<state manager>`
    // * enterStates: `[<root>, <root.post>, <root.post.show>]`
    // * exitStates: `[<root>, <root.post>, <root.post.index>]`
    //
    // The goal of this code is to remove the common states, so we
    // have:
    //
    // * resolveState: `<root.post>`
    // * enterStates: `[<root.post.show>]`
    // * exitStates: `[<root.post.index>]`
    //
    // This avoid unnecessary calls to the enter and exit transitions.
    while (enterStates.length > 0 && enterStates[0] === exitStates[0]) {
      resolveState = enterStates.shift();
      exitStates.shift();
    }

    // Cache the enterStates, exitStates, and resolveState for the
    // current state and the `path`.
    var transitions = {
      exitStates: exitStates,
      enterStates: enterStates,
      resolveState: resolveState
    };

    currentState.setPathsCache(this, path, transitions);

    return transitions;
  },

  /**
    A trigger to setup the state contexts. Each state is setup with
    an enterState.

    @method triggerSetupContext
    @param transitions
  */
  triggerSetupContext(transitions) {
    let enterStates = transitions.enterStates;
    let transitionEvent = get(this, 'transitionEvent');

    forEach(enterStates, function(state) {
      state.trigger(transitionEvent, this);
    }, this);
  },

  /**
    Returns the state instance by name. If state is not found the parentState
    is returned instead.

    @method getState
    @param name
  */
  getState(name) {
    var state = get(this, name),
        parentState = get(this, 'parentState');

    if (state) {
      return state;
    } else if (parentState) {
      return parentState.getState(name);
    }
  },

  /**
    Causes a transition from the exitState of one state to the enterState of another
    state in the state machine. At the end of the transition the currentState is set
    to the finalState of the transition passed into this method.

    @method enterState
    @param transition
  */
  enterState(transition) {
    var log = this.enableLogging;

    var exitStates = transition.exitStates.slice(0).reverse();
    forEach(exitStates, function(state) {
      state.trigger('exit', this);
    }, this);

    forEach(transition.enterStates, function(state) {
      if (log) { Ember.Logger.log("STATEMANAGER: Entering " + get(state, 'path')); }
      state.trigger('enter', this);
    }, this);

    this.set('currentState', transition.finalState);
  }
});
