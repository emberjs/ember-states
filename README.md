# ember-states [![Build Status](https://travis-ci.org/emberjs/ember-states.png)](https://travis-ci.org/emberjs/ember-states)

`ember-states` is Ember's implementation of a finite state machine. A `StateManager` instance manages a number of properties that are instances of `State`, tracks the current active state, and triggers callbacks when states have changed.

For more info check documentation of `StateManager` in [addon/state-manager.js](https://github.com/emberjs/ember-states/blob/master/addon/state-manager.js)

## Including In An Ember Application

Here is the simplest way to get started with ember-states:

```sh
ember install ember-states
```

## How to Run Unit Tests

```sh
npm install
ember test
```
