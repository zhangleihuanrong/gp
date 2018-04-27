#include <iostream>
#include "logging.h"

struct ColorConsoleSink {
// Linux xterm color
// http://stackoverflow.com/questions/2616906/how-do-i-output-coloured-text-to-a-linux-terminal
  enum FG_Color { BLACK = 30,   RED = 31,     GREEN=32,       YELLOW = 33,     BLUE=34,         MAGENTA=35,       CYAN=36,       GRAY=37,
                  DARK_GRAY=90, LIGHT_RED=91, LIGHT_GREEN=92, LIGHT_YELLOW=93, LIGHT_BLUE = 94, LIGHT_MAGENTA=95, LIGHT_CYAN=96, WHITE = 97};

  FG_Color GetColor(const LEVELS level) const {
     if (level.value == TRACE.value) { return DARK_GRAY; }
     if (level.value == DEBUG.value) { return GRAY; }
     if (level.value == WARNING.value) { return LIGHT_MAGENTA; }
     if (level.value == ERROR.value) { return LIGHT_RED; }
     if (g3::internal::wasFatal(level)) { return RED; }

     return WHITE;
  }
  
  void ReceiveLogMessage(g3::LogMessageMover logEntry) {
     auto level = logEntry.get()._level;
     auto color = GetColor(level);

     if (level.value >= DEBUG.value) {
       std::cout << "\033[" << color << "m" 
                 << logEntry.get().toString() 
                 << "\033[m";
     }
  }
};

static auto logWorker = g3::LogWorker::createLogWorker();

void initLogging(const char* /*configPath*/)
{
  auto defaultHandler = logWorker->addDefaultLogger("my", "logs");
   
  g3::initializeLogging(logWorker.get());

  g3::log_levels::enableAll();
  //g3::log_levels::disable(DEBUG);
  //g3::log_levels::disable(TRACE);
   
  logWorker->addSink(std2::make_unique<ColorConsoleSink>(), &ColorConsoleSink::ReceiveLogMessage);
}

